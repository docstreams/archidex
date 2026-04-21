import type { BetaApplication } from "../notion";
import { notifySlack } from "./notify";

export function notifyBetaApply(data: BetaApplication): Promise<void> {
  const fields = [
    { type: "mrkdwn", text: `*Name*: ${data.name}` },
    { type: "mrkdwn", text: `*Company*: ${data.company}` },
    { type: "mrkdwn", text: `*Size*: ${data.size}` },
    { type: "mrkdwn", text: `*Locale*: ${data.locale}` },
  ];
  if (data.role) {
    fields.push({ type: "mrkdwn", text: `*Role*: ${data.role}` });
  }
  if (data.source) {
    fields.push({ type: "mrkdwn", text: `*Source*: ${data.source}` });
  }

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":envelope_with_arrow: New Archidex beta application",
        emoji: true,
      },
    },
    { type: "divider" },
    { type: "section", fields },
  ];

  if (data.useCase) {
    blocks.push(
      { type: "divider" },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: "Use case:", style: { bold: true } },
            ],
          },
          {
            type: "rich_text_preformatted",
            elements: [{ type: "text", text: data.useCase }],
          },
        ],
      },
    );
  }

  blocks.push(
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Email*: ${data.email}` },
      accessory: {
        type: "button",
        style: "primary",
        text: { type: "plain_text", text: "Reply", emoji: true },
        url: `mailto:${data.email}?subject=${encodeURIComponent("Archidex beta access")}`,
        action_id: "reply-email",
      },
    },
  );

  return notifySlack({
    text: `New Archidex beta application from ${data.name} (${data.email}) at ${data.company}`,
    blocks,
  });
}
