import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../shared/constants/routes";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
        <p className="text-sm text-slate-400">Đang tải...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
