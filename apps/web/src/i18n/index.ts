import { uk, type TranslationSchema } from "./translations/uk";
import { en } from "./translations/en";

export type Locale = "uk" | "en";

export const DEFAULT_LOCALE: Locale = "uk";
export const LOCALES: Locale[] = ["uk", "en"];

const translations: Record<Locale, TranslationSchema> = { uk, en };

export function getLocale(currentLocale: string | undefined): Locale {
  return currentLocale === "en" ? "en" : "uk";
}

export function localizeHref(href: string, locale: Locale): string {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api/") ||
    href.startsWith("/en/")
  )
    return href;

  if (href.startsWith("#")) return href;

  if (locale === "uk") return href;

  return `/en${href}`;
}

export function getAlternateHref(
  pathname: string,
  targetLocale: Locale,
): string {
  const cleanPath = pathname.startsWith("/en/")
    ? pathname.slice(3)
    : pathname === "/en"
      ? "/"
      : pathname;

  if (targetLocale === "uk") return cleanPath;
  return `/en${cleanPath}`;
}

export function t(locale: Locale): TranslationSchema {
  return translations[locale];
}

export function tSection<K extends keyof TranslationSchema>(
  locale: Locale,
  section: K,
): TranslationSchema[K] {
  return translations[locale][section];
}

export type { TranslationSchema };
