import { Dropdown, type MenuProps } from "antd";
import { Check, Languages } from "lucide-react";
import IconButton from "./IconButton";
import { useTranslation } from "../../i18n/useAppTranslation";
import type { AppLanguage } from "../../i18n/constants";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const language = (i18n.resolvedLanguage ?? i18n.language ?? "vi") as AppLanguage;

  const items: MenuProps["items"] = (["vi", "en"] as AppLanguage[]).map((value) => ({
    key: value,
    icon: value === language ? <Check className="h-4 w-4" /> : null,
    label: t(`language.${value}`),
    onClick: () => void i18n.changeLanguage(value),
  }));

  return (
    <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items }}>
      <span>
        <IconButton
          icon={Languages}
          aria-label={t("language.label")}
          title={t("language.label")}
          stopPropagation={false}
          className="bg-surface-elevated/76 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
        />
      </span>
    </Dropdown>
  );
}
