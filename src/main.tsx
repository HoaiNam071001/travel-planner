import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { antdTheme } from "./shared/theme/antdTheme";
import "leaflet/dist/leaflet.css";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Không tìm thấy #root trong index.html");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>
);
