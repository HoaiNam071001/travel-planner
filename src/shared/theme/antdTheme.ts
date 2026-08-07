import { theme, type ThemeConfig } from "antd";
import { semanticThemeColors, type ResolvedTheme } from "../../theme/themeTokens";

export function createAntdTheme(resolvedTheme: ResolvedTheme): ThemeConfig {
  const colors = semanticThemeColors[resolvedTheme];
  const isDark = resolvedTheme === "dark";

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: colors.primary,
      colorPrimaryHover: colors.primaryHover,
      colorLink: colors.primary,
      colorInfo: colors.info,
      colorSuccess: colors.success,
      colorWarning: colors.warning,
      colorError: colors.danger,
      colorText: colors.textPrimary,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textMuted,
      colorTextQuaternary: colors.textMuted,
      colorTextPlaceholder: colors.textMuted,
      colorBorder: colors.border,
      colorBorderSecondary: colors.border,
      colorBgLayout: colors.background,
      colorBgBase: colors.surface,
      colorBgContainer: colors.surface,
      colorBgElevated: colors.surfaceElevated,
      colorFillQuaternary: colors.surfaceSecondary,
      borderRadius: 12,
      borderRadiusLG: 16,
      borderRadiusSM: 8,
      controlHeight: 38,
      fontSize: 14,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      boxShadow: isDark
        ? "0 1px 2px 0 rgb(2 6 23 / 0.35), 0 12px 24px -12px rgb(15 23 42 / 0.4)"
        : "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
      boxShadowSecondary: isDark
        ? "0 18px 40px -20px rgb(2 6 23 / 0.7)"
        : "0 8px 16px -4px rgb(15 23 42 / 0.08), 0 24px 48px -12px rgb(15 23 42 / 0.18)",
    },
    components: {
      Button: {
        controlHeight: 38,
        controlHeightSM: 30,
        controlHeightLG: 44,
        fontWeight: 500,
        primaryShadow: `0 1px 2px 0 ${isDark ? "rgb(34 211 238 / 0.28)" : "rgb(6 182 212 / 0.35)"}`,
        defaultShadow: isDark
          ? "0 1px 2px 0 rgb(2 6 23 / 0.35)"
          : "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        defaultBorderColor: colors.border,
        defaultColor: colors.textSecondary,
      },
      Modal: {
        borderRadiusLG: 20,
        titleFontSize: 17,
      },
      Input: {
        paddingBlock: 7,
        activeShadow: `0 0 0 3px ${isDark ? "rgb(34 211 238 / 0.18)" : "rgb(6 182 212 / 0.12)"}`,
      },
      InputNumber: {
        activeShadow: `0 0 0 3px ${isDark ? "rgb(34 211 238 / 0.18)" : "rgb(6 182 212 / 0.12)"}`,
      },
      DatePicker: {
        activeShadow: `0 0 0 3px ${isDark ? "rgb(34 211 238 / 0.18)" : "rgb(6 182 212 / 0.12)"}`,
        cellActiveWithRangeBg: isDark ? "rgb(34 211 238 / 0.18)" : "#ECFEFF",
      },
      Select: {
        optionSelectedBg: isDark ? "rgb(34 211 238 / 0.14)" : "#ECFEFF",
      },
      Segmented: {
        itemSelectedBg: isDark ? "rgb(34 211 238 / 0.14)" : "rgb(255 255 255 / 0.92)",
        trackBg: isDark ? "rgb(15 23 42 / 0.62)" : "rgb(226 232 240 / 0.72)",
        itemColor: colors.textMuted,
        itemSelectedColor: colors.textPrimary,
        borderRadius: 10,
        controlHeight: 36,
      },
      Tabs: {
        inkBarColor: colors.primary,
        itemSelectedColor: colors.textPrimary,
        itemHoverColor: colors.textPrimary,
        itemColor: colors.textMuted,
        horizontalItemGutter: 24,
      },
      Pagination: {
        itemActiveBg: isDark ? "rgb(34 211 238 / 0.14)" : "#ECFEFF",
      },
      Tooltip: {
        colorBgSpotlight: isDark ? "#020617" : "#0F172A",
        borderRadius: 8,
      },
      Progress: {
        defaultColor: colors.primary,
        remainingColor: colors.border,
      },
      Dropdown: {
        borderRadiusLG: 14,
      },
      Empty: {
        colorTextDescription: colors.textMuted,
      },
    },
  };
}
