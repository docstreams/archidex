import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const { request } = context;

  if (pathname !== "/") {
    return next();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasLocaleCookie = cookieHeader
    .split(";")
    .some((c) => c.trim().startsWith("locale="));

  if (hasLocaleCookie) {
    return next();
  }

  const cf = (request as Request & { cf?: { country?: string } }).cf;
  const isUkrainianGeo = cf?.country === "UA";

  const acceptLang = request.headers.get("accept-language") ?? "";
  const prefersUkrainian = /\buk\b/i.test(acceptLang);

  if (isUkrainianGeo || prefersUkrainian) {
    const response = await next();
    response.headers.append(
      "Set-Cookie",
      "locale=uk; Path=/; Max-Age=31536000; SameSite=Lax",
    );
    return response;
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/en/",
      "Set-Cookie": "locale=en; Path=/; Max-Age=31536000; SameSite=Lax",
    },
  });
});
