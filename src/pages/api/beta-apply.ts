import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createNotionClient, createBetaApplication } from "../../lib/notion";

export const prerender = false;

interface ApplicationPayload {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  size?: string;
  useCase?: string;
  locale?: string;
  website?: string;
}

interface ApplicationResponse {
  success: boolean;
  message: string;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = 2000;

function jsonResponse(status: number, body: ApplicationResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_LEN) : "";
}

export const POST: APIRoute = async ({ request }) => {
  let payload: ApplicationPayload;

  try {
    payload = (await request.json()) as ApplicationPayload;
  } catch {
    return jsonResponse(400, {
      success: false,
      message: "Invalid request body",
    });
  }

  if (payload.website && payload.website.trim().length > 0) {
    return jsonResponse(200, { success: true, message: "ok" });
  }

  const name = normalize(payload.name);
  const email = normalize(payload.email);
  const company = normalize(payload.company);
  const role = normalize(payload.role);
  const size = normalize(payload.size);
  const useCase = normalize(payload.useCase);
  const locale = payload.locale === "en" ? "en" : "uk";

  if (!name || !email || !company || !size) {
    return jsonResponse(400, {
      success: false,
      message: "Missing required fields",
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    return jsonResponse(400, {
      success: false,
      message: "Invalid email",
    });
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
      name,
      email,
      company,
      role: role || undefined,
      size,
      useCase: useCase || undefined,
      locale,
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
