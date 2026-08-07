import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import I18nProvider from "./i18n/I18nProvider";
import "./i18n";
import { createAntdTheme } from "./shared/theme/antdTheme";
import { ThemeProvider } from "./theme/ThemeProvider";
import { useTheme } from "./theme/useTheme";
import "leaflet/dist/leaflet.css";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Khong tim thay #root trong index.html");

function AppProviders() {
  const { resolvedTheme } = useTheme();

  return (
    <ConfigProvider theme={createAntdTheme(resolvedTheme)}>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppProviders />
    </ThemeProvider>
  </React.StrictMode>
);
