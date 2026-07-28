import { Navigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../shared/constants/routes";
import Button from "../shared/components/Button";

export default function LoginPage() {
  const { session, loading, signInWithGoogle } = useAuth();

  if (!loading && session) {
    return <Navigate to={ROUTES.LOCATIONS} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 font-sans">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-stone-50">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-2xl text-cyan-900">Travel Planner</h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">
          Đăng nhập để bắt đầu lên kế hoạch chuyến đi của bạn
        </p>

        <Button block size="large" onClick={() => signInWithGoogle()}>
          Đăng nhập với Google
        </Button>
      </div>
    </div>
  );
}
