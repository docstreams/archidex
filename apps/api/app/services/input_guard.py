"""Input guard — prompt-injection detection layer.

Scans user messages for common prompt-injection patterns and returns a
rejection result when a high-confidence match is found.  The guard is
intentionally strict: suspicious messages are **blocked**, not silently
cleaned, so the user receives clear feedback.
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pattern definitions
# ---------------------------------------------------------------------------
# Each entry is ``(compiled_regex, human-readable reason)``.
# Patterns are case-insensitive and tested against the full message text.
# Covers English, Ukrainian (UA) and Russian (RU) common phrasings.

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # -- Direct prompt / instruction extraction --
    (
        re.compile(
            r"(reveal|show|print|output|display|repeat|give|tell)\b.{0,30}"
            r"(system\s*prompt|instructions|initial\s*prompt|hidden\s*prompt"
            r"|system\s*message|internal\s*instructions)",
            re.IGNORECASE,
        ),
        "Attempted system prompt extraction",
    ),
    (
        re.compile(
            r"what\s+(are|is|were)\s+(your|the)\s+"
            r"(system\s*prompt|instructions|initial\s*prompt|rules|directives"
            r"|system\s*message|hidden\s*(instructions|prompt))",
            re.IGNORECASE,
        ),
        "Attempted system prompt extraction (question form)",
    ),
    (
        re.compile(
            r"(repeat|echo|copy)\s+(the\s+)?(above|previous|preceding|everything"
            r"|text\s+before)",
            re.IGNORECASE,
        ),
        "Attempted extraction via repeat/echo",
    ),
    # -- Instruction override / jailbreak --
    (
        re.compile(
            r"ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)"
            r"\s*(instructions|rules|prompts|directives|context)",
            re.IGNORECASE,
        ),
        "Instruction override attempt",
    ),
    (
        re.compile(
            r"(disregard|forget|override|bypass|skip)\s+.{0,20}"
            r"(instructions|rules|prompt|guidelines|restrictions|safety)",
            re.IGNORECASE,
        ),
        "Instruction override attempt",
    ),
    (
        re.compile(
            r"you\s+are\s+now\s+(a|an|no\s+longer|DAN|in|unrestricted)",
            re.IGNORECASE,
        ),
        "Role reassignment / jailbreak attempt",
    ),
    (
        re.compile(r"\bDAN\b.*\bmode\b|\bmode\b.*\bDAN\b", re.IGNORECASE),
        "DAN jailbreak attempt",
    ),
    (
        re.compile(
            r"(enter|switch\s+to|activate|enable)\s+.{0,15}"
            r"(developer|debug|admin|unrestricted|jailbreak|god)\s*mode",
            re.IGNORECASE,
        ),
        "Mode-switching jailbreak attempt",
    ),
    # -- Role / delimiter injection --
    (
        re.compile(
            r"(\[SYSTEM\]|\[INST\]|<<SYS>>|<\|im_start\|>|<\|system\|>)",
            re.IGNORECASE,
        ),
        "Role-delimiter injection",
    ),
    (
        re.compile(
            r"(###\s*(system|instruction|new\s*prompt))",
            re.IGNORECASE,
        ),
        "Markdown role injection",
    ),
    (
        re.compile(
            r"(system|assistant)\s*:\s*.{5,}",
            re.IGNORECASE,
        ),
        "Role prefix injection",
    ),
    # -- Encoding / obfuscation evasion --
    (
        re.compile(
            r"(base64|rot13|hex)\s*(encode|decode|convert|translate)",
            re.IGNORECASE,
        ),
        "Encoding evasion attempt",
    ),
    # -- Ukrainian / Russian prompt-injection phrases --
    (
        re.compile(
            r"(покажи|виведи|повтори|розкажи|надай|покажіть)\s*.{0,20}"
            r"(системн|інструкці|промпт|прихован|початков)",
            re.IGNORECASE,
        ),
        "UA: System prompt extraction attempt",
    ),
    (
        re.compile(
            r"(ігноруй|забудь|відкинь|пропусти)\s*.{0,20}"
            r"(попередні|минулі|всі)\s*(інструкці|правила|вказівки)",
            re.IGNORECASE,
        ),
        "UA: Instruction override attempt",
    ),
    (
        re.compile(
            r"(покажи|выведи|повтори|расскажи|дай)\s*.{0,20}"
            r"(системн|инструкци|промпт|скрыт|начальн)",
            re.IGNORECASE,
        ),
        "RU: System prompt extraction attempt",
    ),
    (
        re.compile(
            r"(игнорируй|забудь|отбрось|пропусти)\s*.{0,20}"
            r"(предыдущие|прошлые|все)\s*(инструкци|правила|указания)",
            re.IGNORECASE,
        ),
        "RU: Instruction override attempt",
    ),
    # -- Hypothetical / role-play framing --
    (
        re.compile(
            r"(pretend|imagine|hypothetically|roleplay|act\s+as\s+if)\s+.{0,40}"
            r"(no\s+(rules|restrictions|guidelines)|without\s+(rules|restrictions)"
            r"|unrestricted|unfiltered)",
            re.IGNORECASE,
        ),
        "Hypothetical framing jailbreak",
    ),
]

# Refusal message returned to the user when a message is blocked.
REFUSAL_MESSAGE = (
    "Your message was blocked because it appears to contain a prompt-injection "
    "attempt. If you believe this is a mistake, please rephrase your question "
    "to focus on the document content."
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def check_message(text: str) -> tuple[bool, str | None]:
    """Check *text* against known prompt-injection patterns.

    Returns ``(is_safe, rejection_reason)``.  When ``is_safe`` is ``True``,
    ``rejection_reason`` is ``None``.
    """
    for pattern, reason in _PATTERNS:
        if pattern.search(text):
            logger.warning(
                "Input guard BLOCKED message — reason: %s | snippet: %.120s",
                reason,
                text,
            )
            return False, reason

    return True, None
