import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Layers,
  Map,
  MapPin,
  MousePointerClick,
  Route as RouteIcon,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../shared/constants/routes";
import Button from "../shared/components/Button";

interface Tour {
  icon: LucideIcon;
  tag: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}

const TOUR: Tour[] = [
  {
    icon: Map,
    tag: "Tổng quan kế hoạch",
    title: "Nhìn cả chuyến đi trong một trang",
    description:
      "Mỗi kế hoạch có một trang tổng quan gộp lịch trình từng chặng, phân bổ chi phí theo ngày và " +
      "danh sách địa điểm sẽ ghé qua — không phải lật qua lại nhiều màn hình mới hình dung được cả chuyến đi.",
    image: "/home-plan.png",
    alt: "Trang tổng quan kế hoạch Đà Nẵng Trip: hero số liệu, lịch trình theo ngày và phân bổ chi phí",
  },
  {
    icon: Layers,
    tag: "Lịch trình dạng gantt",
    title: "Kéo-thả để xếp giờ, không cần đoán",
    description:
      "Chặng và hoạt động vẽ đúng tỉ lệ thời gian trên một trục ngang. Kéo giữa thanh để dời giờ, kéo mép " +
      "để đổi thời lượng — chặng nào chưa xếp lịch nằm gọn ở cột bên phải, kéo vào là xong.",
    image: "/gantt-plan.png",
    alt: "Lịch trình dạng gantt với các chặng và hoạt động xếp theo khung giờ",
  },
  {
    icon: MapPin,
    tag: "Sổ tay địa điểm",
    title: "Lưu địa điểm, tìm quanh đây trên bản đồ",
    description:
      "Dán link Google Maps là tự điền tên và toạ độ. Bản đồ luôn hiện bên cạnh danh sách, bấm nút " +
      "\"Tìm địa điểm ở đây\" là lọc ngay những gì đã lưu quanh vị trí đang xem.",
    image: "/location.png",
    alt: "Sổ tay địa điểm với danh sách bên trái và bản đồ tìm quanh đây bên phải",
  },
];

interface Step {
  icon: LucideIcon;
  label: string;
  text: string;
}

const STEPS: Step[] = [
  { icon: MapPin, label: "Địa điểm", text: "Lưu nơi muốn ghé, kèm ảnh và toạ độ." },
  { icon: Sparkles, label: "Hoạt động", text: "Gắn giá, khung giờ, một hoặc nhiều địa điểm." },
  { icon: RouteIcon, label: "Chặng", text: "Gom hoạt động lại theo một khoảng thời gian." },
  { icon: Map, label: "Kế hoạch", text: "Nhiều chặng gộp thành chuyến đi hoàn chỉnh." },
];

export default function HomePage() {
  const { session, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const isAuthed = !loading && Boolean(session);

  function handleCta() {
    if (isAuthed) navigate(ROUTES.PLANS);
    else void signInWithGoogle();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* --------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0" />
            <span className="font-display text-[15px] font-bold tracking-tight text-slate-900">
              Travel Planner
            </span>
          </div>
          <Button variant="primary" onClick={handleCta} icon={<ArrowRight className="h-4 w-4" />} iconPlacement="end">
            {isAuthed ? "Vào ứng dụng" : "Đăng nhập"}
          </Button>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-slate-950">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-brand-800/60 via-slate-950 to-slate-950"
        />
        <div aria-hidden className="hero-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 ring-1 ring-inset ring-white/15">
            <Sparkles className="h-3.5 w-3.5 text-brand-300" />
            Miễn phí · Dùng cho lên kế hoạch cá nhân
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl">
            Mọi chuyến đi, gọn trong một kế hoạch.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
            Lưu địa điểm, tạo hoạt động kèm giá và khung giờ, gom thành từng chặng rồi kéo-thả
            xếp lịch trên một trục thời gian duy nhất — không cần lập bảng tính chằng chịt nữa.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="large"
              onClick={handleCta}
              icon={<ArrowRight className="h-4 w-4" />}
              iconPlacement="end"
            >
              {isAuthed ? "Vào ứng dụng" : "Tiếp tục với Google"}
            </Button>
            <a
              href="#tour"
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white/70 ring-1 ring-inset ring-white/15 transition hover:bg-white/5 hover:text-white"
            >
              Xem cách hoạt động
            </a>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- product tour */}
      <section id="tour" className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:space-y-28 sm:px-6 sm:py-28">
        {TOUR.map(({ icon: Icon, tag, title, description, image, alt }, index) => (
          <div
            key={tag}
            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
              index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/70">
                <Icon className="h-3.5 w-3.5" />
                {tag}
              </span>
              <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{description}</p>
            </div>

            <div className="group relative animate-fade-up">
              <div
                aria-hidden
                className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-br from-brand-500/10 to-transparent blur-2xl"
              />
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-pop">
                <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </div>
                <img src={image} alt={alt} loading="lazy" className="w-full" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* --------------------------------------------------------------- steps */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/70">
              <MousePointerClick className="h-3.5 w-3.5" />
              Cách hoạt động
            </span>
            <h2 className="mx-auto mt-4 max-w-lg text-2xl font-bold text-slate-900 sm:text-3xl">
              Bốn khối, xếp chồng lên nhau
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, label, text }, index) => (
              <div key={label} className="surface relative p-5">
                <span className="font-mono text-xs font-medium text-slate-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/70">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-[15px] font-bold text-slate-900">{label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{text}</p>
                {index < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-300 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ final cta */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center sm:px-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-brand-800/60 via-slate-950 to-slate-950"
          />
          <div aria-hidden className="hero-grid absolute inset-0 opacity-60" />
          <div className="relative">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_8px_24px_-6px_rgb(6_182_212_/_0.7)] mx-auto">
              <Wallet className="h-5 w-5" />
            </span>
            <h2 className="mx-auto mt-5 max-w-md font-display text-2xl font-extrabold text-white sm:text-3xl">
              Kế hoạch tiếp theo, bắt đầu ngay
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
              Đăng nhập bằng Google, dữ liệu của bạn được bảo vệ bằng Row Level Security trên Supabase.
            </p>
            <div className="mt-7">
              <Button
                variant="primary"
                size="large"
                onClick={handleCta}
                icon={<ArrowRight className="h-4 w-4" />}
                iconPlacement="end"
              >
                {isAuthed ? "Vào ứng dụng" : "Tiếp tục với Google"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 px-4 py-8 text-center text-xs text-slate-400 sm:px-6">
        Travel Planner — dự án cá nhân để lên kế hoạch đi chơi.
      </footer>
    </div>
  );
}
