// Token antd khớp palette Tailwind hiện có (teal-700 làm màu chính, bo góc xl).
export const antdTheme = {
  token: {
    colorPrimary: "#0f766e", // teal-700
    colorLink: "#0f766e",
    borderRadius: 8,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Button: {
      controlHeight: 38,
    },
    Modal: {
      borderRadiusLG: 12,
    },
  },
};
