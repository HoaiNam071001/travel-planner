import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/useAppTranslation";
import { ROUTES } from "../shared/constants/routes";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const { t } = useTranslation("auth");

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border/20 border-t-primary" />
        <p className="text-sm text-text-muted">{t("protectedRoute.loading")}</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
