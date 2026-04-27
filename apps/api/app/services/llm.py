from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from google import genai
from google.genai import types

from app.config import settings
from app.services.usage import check_llm_limit, increment_llm_tokens

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.google_api_key)
    return _client


def _build_contents(messages: list[dict[str, str]]) -> list[types.Content]:
    """Convert message dicts to Gemini Content objects."""
    contents: list[types.Content] = []
    for msg in messages:
        role = "model" if msg["role"] == "assistant" else msg["role"]
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part(text=msg["content"])],
            )
        )
    return contents


def _build_config(system_prompt: str = "") -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=system_prompt if system_prompt else None,
        temperature=0.3,
        max_output_tokens=4096,
        safety_settings=[
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold="BLOCK_LOW_AND_ABOVE",
            ),
        ],
    )


async def generate(
    messages: list[dict[str, str]],
    system_prompt: str = "",
) -> str:
    """Generate a response using Gemini 2.5 Flash.

    *messages* is a list of ``{"role": "user"|"model", "content": "..."}`` dicts.
    """
    await check_llm_limit()

    client = _get_client()
    contents = _build_contents(messages)
    config = _build_config(system_prompt)

    response = await client.aio.models.generate_content(
        model=settings.llm_model,
        contents=contents,
        config=config,
    )

    text = response.text or ""

    # Track usage
    meta = response.usage_metadata
    if meta:
        prompt_tok = meta.prompt_token_count or 0
        completion_tok = meta.candidates_token_count or 0
        await increment_llm_tokens(prompt_tok, completion_tok)
        logger.info(
            "LLM generated %d chars (%d prompt + %d completion tokens)",
            len(text),
            prompt_tok,
            completion_tok,
        )
    else:
        logger.info("LLM generated %d chars", len(text))

    return text


async def generate_stream(
    messages: list[dict[str, str]],
    system_prompt: str = "",
) -> AsyncIterator[str]:
    """Stream a response from Gemini 2.5 Flash, yielding text chunks."""
    await check_llm_limit()

    client = _get_client()
    contents = _build_contents(messages)
    config = _build_config(system_prompt)

    total_chars = 0
    prompt_tok = 0
    completion_tok = 0

    async for chunk in await client.aio.models.generate_content_stream(
        model=settings.llm_model,
        contents=contents,
        config=config,
    ):
        text = chunk.text or ""
        if text:
            total_chars += len(text)
            yield text
        # The final chunk carries usage_metadata
        if chunk.usage_metadata:
            prompt_tok = chunk.usage_metadata.prompt_token_count or 0
            completion_tok = chunk.usage_metadata.candidates_token_count or 0

    # Track usage after stream completes
    if prompt_tok or completion_tok:
        await increment_llm_tokens(prompt_tok, completion_tok)

    logger.info(
        "LLM streamed %d chars (%d prompt + %d completion tokens)",
        total_chars,
        prompt_tok,
        completion_tok,
    )
