import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/vi";
import { LANGUAGE_STORAGE_KEY } from "./constants";

export default function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n: activeI18n } = useTranslation();

  useEffect(() => {
    const syncLanguage = (language: string) => {
      document.documentElement.lang = language;
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      dayjs.locale(language);
    };

    syncLanguage(activeI18n.language);
    activeI18n.on("languageChanged", syncLanguage);
    return () => {
      activeI18n.off("languageChanged", syncLanguage);
    };
  }, [activeI18n]);

  return children;
}
