import { Dropdown, type MenuProps } from "antd";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import IconButton from "./IconButton";
import { useTheme } from "../../theme/useTheme";
import { type ThemeMode } from "../../theme/themeTokens";
import { useTranslation } from "../../i18n/useAppTranslation";

const ICON_BY_MODE = {
  light: Sun,
  dark: Moon,
  system: Laptop,
} as const;

export default function ThemeSwitcher() {
  const { t } = useTranslation("common");
  const { mode, setMode } = useTheme();
  const CurrentIcon = ICON_BY_MODE[mode];

  const items: MenuProps["items"] = (["light", "dark", "system"] as ThemeMode[]).map((value) => {
    const OptionIcon = ICON_BY_MODE[value];
    return {
      key: value,
      icon: value === mode ? <Check className="h-4 w-4" /> : <OptionIcon className="h-4 w-4" />,
      label: t(`theme.${value}`),
      onClick: () => setMode(value),
    };
  });

  return (
    <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items }}>
      <span>
        <IconButton
          icon={CurrentIcon}
          aria-label={t("theme.label")}
          title={t("theme.label")}
          stopPropagation={false}
          className="bg-surface-elevated/76 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
        />
      </span>
    </Dropdown>
  );
}
