// Token antd khớp palette Tailwind hiện có (cyan-500 #06B6D4 làm màu chính, bo góc xl).
export const antdTheme = {
  token: {
    colorPrimary: "#06B6D4", // cyan-500
    colorLink: "#06B6D4",
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
