export const LANGUAGE_STORAGE_KEY = "travel-planner-language";

export const SUPPORTED_LANGUAGES = ["vi", "en"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return Boolean(value && SUPPORTED_LANGUAGES.includes(value as AppLanguage));
}
