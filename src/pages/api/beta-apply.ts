import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { createNotionClient, createBetaApplication } from "../../lib/notion";

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

interface ApplicationResponse {
  success: boolean;
  message: string;
  error?: string;
}

function jsonResponse(status: number, body: ApplicationResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
      error: parsed.error.issues.map((i) => i.message).join(", "),
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
    const client = createNotionClient(env.NOTION_TOKEN);
    await createBetaApplication(client, env.NOTION_BETA_DB_ID, {
      name: data.name,
      email: data.email,
      company: data.company,
      role: data.role || undefined,
      size: data.size,
      useCase: data.useCase || undefined,
      locale: data.locale,
      source: request.headers.get("referer") ?? undefined,
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
