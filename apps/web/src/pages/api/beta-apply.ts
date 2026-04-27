import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { createNotionClient, createBetaApplication } from "../../lib/notion";
import { slack } from "../../lib/slack";
import { getPostHogServer } from "../../lib/posthog-server";

export const prerender = false;

const BetaApplicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).optional().default(""),
  size: z.string().trim().min(1).max(50),
  useCase: z.string().trim().max(2000).optional().default(""),
  locale: z.enum(["uk", "en"]).default("uk"),
  website: z.string().optional().default(""),
});

type FieldName = "name" | "email" | "company" | "size";

interface ApplicationResponse {
  success: boolean;
  message: string;
  error?: string;
  fieldErrors?: Partial<Record<FieldName, string>>;
}

function jsonResponse(status: number, body: ApplicationResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const REPORTABLE_FIELDS: readonly FieldName[] = [
  "name",
  "email",
  "company",
  "size",
];

function mapZodFieldErrors(
  error: z.ZodError,
): Partial<Record<FieldName, string>> {
  const result: Partial<Record<FieldName, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      (REPORTABLE_FIELDS as readonly string[]).includes(key)
    ) {
      const field = key as FieldName;
      if (!result[field]) result[field] = issue.message;
    }
  }
  return result;
}

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return jsonResponse(400, {
      success: false,
      message: "Invalid request body",
    });
  }

  const parsed = BetaApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      message: "Invalid input",
      fieldErrors: mapZodFieldErrors(parsed.error),
    });
  }

  const data = parsed.data;

  if (data.website.trim().length > 0) {
    return jsonResponse(200, { success: true, message: "ok" });
  }

  if (!env.NOTION_TOKEN || !env.NOTION_BETA_DB_ID) {
    console.error("Notion credentials missing from runtime env");
    return jsonResponse(500, {
      success: false,
      message: "Server misconfigured",
    });
  }

  try {
    const application = {
      name: data.name,
      email: data.email,
      company: data.company,
      role: data.role || undefined,
      size: data.size,
      useCase: data.useCase || undefined,
      locale: data.locale,
      source: request.headers.get("referer") ?? undefined,
    };
    await slack.notify.betaApply(application);

    const client = createNotionClient(env.NOTION_TOKEN);
    await createBetaApplication(client, env.NOTION_BETA_DB_ID, application);

    const posthog = getPostHogServer();
    const sessionId = request.headers.get("X-PostHog-Session-Id") || undefined;
    const distinctId =
      request.headers.get("X-PostHog-Distinct-Id") || data.email;
    posthog.capture({
      distinctId,
      event: "beta_application_received",
      properties: {
        $session_id: sessionId,
        company: data.company,
        size: data.size,
        locale: data.locale,
        has_role: !!data.role,
        has_use_case: !!data.useCase,
      },
    });

    return jsonResponse(200, {
      success: true,
      message: "Application received",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("beta-apply error:", message);
    return jsonResponse(500, {
      success: false,
      message: "Failed to save application",
      error: message,
    });
  }
};
