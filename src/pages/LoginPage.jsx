import { Navigate } from "react-router-dom";
import { Compass, Map, Route as RouteIcon, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../shared/constants/routes";
import Button from "../shared/components/Button";

const HIGHLIGHTS = [
  { icon: Map, text: "Lưu địa điểm kèm ảnh, toạ độ và link Google Maps" },
  { icon: Sparkles, text: "Tạo hoạt động với khung giờ, chi phí và nhiều địa điểm" },
  { icon: RouteIcon, text: "Kéo-thả gom hoạt động thành chặng, chặng thành kế hoạch" },
];

export default function LoginPage() {
  const { session, loading, signInWithGoogle } = useAuth();

  if (!loading && session) {
    return <Navigate to={ROUTES.PLANS} replace />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Cột trái: pitch trên nền tối, cùng ngôn ngữ với hero của trang Tổng quan. */}
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-brand-800/70 via-slate-950 to-slate-950"
        />
        <div aria-hidden className="hero-grid absolute inset-0 opacity-70" />
        <div
          aria-hidden
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
            <Compass className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight">
            Travel Planner
          </span>
        </div>

        <div className="relative">
          <h2 className="max-w-md font-display text-4xl font-extrabold leading-[1.15] text-white">
            Mọi chuyến đi,
            <br />
            gọn trong một kế hoạch.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/35">
          Dữ liệu của bạn được bảo vệ bằng Row Level Security trên Supabase.
        </p>
      </div>

      {/* Cột phải: form đăng nhập */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_24px_-6px_rgb(6_182_212_/_0.7)] lg:hidden">
            <Compass className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Đăng nhập để tiếp tục lên kế hoạch cho chuyến đi của bạn.
          </p>

          <Button
            block
            size="large"
            className="mt-8"
            onClick={() => signInWithGoogle()}
            icon={<GoogleMark />}
          >
            Tiếp tục với Google
          </Button>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Chỉ dùng cho mục đích cá nhân. Bằng việc đăng nhập, bạn đồng ý để ứng dụng lưu
            địa điểm và kế hoạch của bạn trên Supabase.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
