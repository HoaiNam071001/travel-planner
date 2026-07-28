import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import LocationsPage from "./pages/LocationsPage";
import ItemsPage from "./pages/ItemsPage";
import UnitsPage from "./pages/UnitsPage";
import PlansPage from "./pages/PlansPage";
import { ROUTES } from "./shared/constants/routes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to={ROUTES.LOCATIONS} replace />} />
            <Route path={ROUTES.LOCATIONS} element={<LocationsPage />} />
            <Route path={ROUTES.ITEMS} element={<ItemsPage />} />
            <Route path={ROUTES.UNITS} element={<UnitsPage />} />
            <Route path={ROUTES.PLANS} element={<PlansPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.LOCATIONS} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
