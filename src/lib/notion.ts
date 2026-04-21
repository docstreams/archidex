export interface NotionClient {
  apiKey: string;
}

export interface BetaApplication {
  name: string;
  email: string;
  company: string;
  role?: string;
  size: string;
  useCase?: string;
  locale: "uk" | "en";
  source?: string;
}

export function createNotionClient(apiKey: string): NotionClient {
  return { apiKey };
}

async function notionFetch<T>(
  client: NotionClient,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${client.apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

export async function createBetaApplication(
  client: NotionClient,
  databaseId: string,
  data: BetaApplication,
): Promise<{ id: string }> {
  return notionFetch<{ id: string }>(client, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "database_id", database_id: databaseId },
      properties: {
        Name: {
          title: [{ type: "text", text: { content: data.name } }],
        },
        "Work email": {
          email: data.email,
        },
        Company: {
          rich_text: [{ type: "text", text: { content: data.company } }],
        },
        ...(data.role && {
          Role: {
            rich_text: [{ type: "text", text: { content: data.role } }],
          },
        }),
        "Company size": {
          select: { name: data.size },
        },
        ...(data.useCase && {
          "Use case": {
            rich_text: [{ type: "text", text: { content: data.useCase } }],
          },
        }),
        Locale: {
          select: { name: data.locale },
        },
        ...(data.source && {
          Source: {
            rich_text: [{ type: "text", text: { content: data.source } }],
          },
        }),
        Status: {
          status: { name: "New" },
        },
      },
    }),
  });
}
