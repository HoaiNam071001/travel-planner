import type { ThemeConfig } from "antd";

// Token antd khớp design system Tailwind: brand-500 (#06B6D4) làm màu chính,
// neutral slate, bo góc 10-18px, shadow nhiều lớp rất nhẹ.
const SLATE = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  800: "#1E293B",
  900: "#0F172A",
} as const;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#06B6D4", // brand-500 (= cyan-500)
    colorPrimaryHover: "#0891B2", // brand-600
    colorLink: "#0E7490", // brand-700
    colorInfo: "#06B6D4",
    colorSuccess: "#10B981",
    colorWarning: "#F59E0B",
    colorError: "#EF4444",

    colorText: SLATE[800],
    colorTextSecondary: SLATE[600],
    colorTextTertiary: SLATE[500],
    colorTextQuaternary: SLATE[400],
    colorTextPlaceholder: SLATE[400],
    colorBorder: SLATE[300],
    colorBorderSecondary: SLATE[200],
    colorBgLayout: SLATE[50],
    colorFillQuaternary: SLATE[100],

    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 8,

    controlHeight: 38,
    fontSize: 14,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',

    boxShadow: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
    boxShadowSecondary:
      "0 8px 16px -4px rgb(15 23 42 / 0.08), 0 24px 48px -12px rgb(15 23 42 / 0.18)",
  },
  components: {
    Button: {
      controlHeight: 38,
      controlHeightSM: 30,
      controlHeightLG: 44,
      fontWeight: 500,
      primaryShadow: "0 1px 2px 0 rgb(6 182 212 / 0.35)",
      defaultShadow: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
      defaultBorderColor: SLATE[200],
      defaultColor: SLATE[600],
    },
    Modal: {
      borderRadiusLG: 18,
      titleFontSize: 17,
    },
    Input: {
      paddingBlock: 7,
      activeShadow: "0 0 0 3px rgb(6 182 212 / 0.12)",
    },
    InputNumber: {
      activeShadow: "0 0 0 3px rgb(6 182 212 / 0.12)",
    },
    DatePicker: {
      activeShadow: "0 0 0 3px rgb(6 182 212 / 0.12)",
      cellActiveWithRangeBg: "#ECFEFF", // brand-50
    },
    Select: {
      optionSelectedBg: "#ECFEFF",
    },
    Segmented: {
      itemSelectedBg: "#FFFFFF",
      trackBg: SLATE[100],
      itemColor: SLATE[500],
      itemSelectedColor: "#0E7490",
      borderRadius: 10,
      controlHeight: 36,
    },
    Tabs: {
      inkBarColor: "#0891B2",
      itemSelectedColor: SLATE[900],
      itemHoverColor: SLATE[800],
      itemColor: SLATE[500],
      horizontalItemGutter: 24,
    },
    Pagination: {
      itemActiveBg: "#ECFEFF",
    },
    Tooltip: {
      colorBgSpotlight: SLATE[900],
      borderRadius: 8,
    },
    Progress: {
      defaultColor: "#06B6D4",
      remainingColor: SLATE[200],
    },
    Dropdown: {
      borderRadiusLG: 14,
    },
    Empty: {
      colorTextDescription: SLATE[400],
    },
  },
};
