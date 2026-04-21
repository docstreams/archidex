import { env } from "cloudflare:workers";

export async function notifySlack(message: {
  text: string;
  blocks?: unknown[];
}): Promise<void> {
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("Slack webhook URL is not configured. Skipping notification.");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error(`Slack webhook error: ${res.status} - ${await res.text()}`);
    }
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}
