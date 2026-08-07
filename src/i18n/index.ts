import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LANGUAGE_STORAGE_KEY, isSupportedLanguage } from "./constants";
import commonEn from "../locales/en/common.json";
import navigationEn from "../locales/en/navigation.json";
import validationEn from "../locales/en/validation.json";
import formsEn from "../locales/en/forms.json";
import tableEn from "../locales/en/table.json";
import homeEn from "../locales/en/home.json";
import authEn from "../locales/en/auth.json";
import plansEn from "../locales/en/plans.json";
import locationsEn from "../locales/en/locations.json";
import itemsEn from "../locales/en/items.json";
import unitsEn from "../locales/en/units.json";
import planDetailEn from "../locales/en/planDetail.json";
import commonVi from "../locales/vi/common.json";
import navigationVi from "../locales/vi/navigation.json";
import validationVi from "../locales/vi/validation.json";
import formsVi from "../locales/vi/forms.json";
import tableVi from "../locales/vi/table.json";
import homeVi from "../locales/vi/home.json";
import authVi from "../locales/vi/auth.json";
import plansVi from "../locales/vi/plans.json";
import locationsVi from "../locales/vi/locations.json";
import itemsVi from "../locales/vi/items.json";
import unitsVi from "../locales/vi/units.json";
import planDetailVi from "../locales/vi/planDetail.json";

function readInitialLanguage() {
  if (typeof window === "undefined") return "vi";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : "vi";
}

void i18n.use(initReactI18next).init({
  lng: readInitialLanguage(),
  fallbackLng: "vi",
  supportedLngs: ["vi", "en"],
  defaultNS: "common",
  ns: ["common", "navigation", "validation", "forms", "table", "home", "auth", "plans", "locations", "items", "units", "planDetail"],
  interpolation: { escapeValue: false },
  resources: {
    vi: {
      common: commonVi,
      navigation: navigationVi,
      validation: validationVi,
      forms: formsVi,
      table: tableVi,
      home: homeVi,
      auth: authVi,
      plans: plansVi,
      locations: locationsVi,
      items: itemsVi,
      units: unitsVi,
      planDetail: planDetailVi,
    },
    en: {
      common: commonEn,
      navigation: navigationEn,
      validation: validationEn,
      forms: formsEn,
      table: tableEn,
      home: homeEn,
      auth: authEn,
      plans: plansEn,
      locations: locationsEn,
      items: itemsEn,
      units: unitsEn,
      planDetail: planDetailEn,
    },
  },
});

export default i18n;
