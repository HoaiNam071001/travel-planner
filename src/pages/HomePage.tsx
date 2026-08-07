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
import { useTranslation } from "../i18n/useAppTranslation";
import { ROUTES } from "../shared/constants/routes";
import Button from "../shared/components/Button";

interface Tour {
  icon: LucideIcon;
  key: "overview" | "timeline" | "locations";
  image: string;
}

const TOUR: Tour[] = [
  { icon: Map, key: "overview", image: "/home-plan.png" },
  { icon: Layers, key: "timeline", image: "/gantt-plan.png" },
  { icon: MapPin, key: "locations", image: "/location.png" },
];

interface Step {
  icon: LucideIcon;
  key: "location" | "item" | "unit" | "plan";
}

const STEPS: Step[] = [
  { icon: MapPin, key: "location" },
  { icon: Sparkles, key: "item" },
  { icon: RouteIcon, key: "unit" },
  { icon: Map, key: "plan" },
];

export default function HomePage() {
  const { session, loading, signInWithGoogle } = useAuth();
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const isAuthed = !loading && Boolean(session);

  function handleCta() {
    if (isAuthed) navigate(ROUTES.PLANS);
    else void signInWithGoogle();
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <header className="sticky top-0 z-40 border-b border-border/10 bg-bg/84 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0" />
            <span className="font-display text-[15px] font-bold tracking-tight text-text-primary">
              Travel Planner
            </span>
          </div>
          <Button variant="primary" onClick={handleCta} icon={<ArrowRight className="h-4 w-4" />} iconPlacement="end">
            {isAuthed ? t("nav.ctaAuthed") : t("nav.ctaGuest")}
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.94),rgba(2,6,23,1))]"
        />
        <div aria-hidden className="hero-grid absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/74">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("hero.badge")}
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/62">{t("hero.description")}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="large"
              onClick={handleCta}
              icon={<ArrowRight className="h-4 w-4" />}
              iconPlacement="end"
            >
              {isAuthed ? t("hero.ctaAuthed") : t("hero.ctaGuest")}
            </Button>
            <a
              href="#tour"
              className="inline-flex h-10 items-center rounded-2xl bg-white/[0.04] px-4 text-sm font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
            >
              {t("hero.secondary")}
            </a>
          </div>
        </div>
      </section>

      <section id="tour" className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:space-y-28 sm:px-6 sm:py-28">
        {TOUR.map(({ icon: Icon, key, image }, index) => (
          <div
            key={key}
            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
          >
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
                <Icon className="h-3.5 w-3.5" />
                {t(`tour.${key}.tag`)}
              </span>
              <h2 className="mt-4 text-2xl font-bold text-text-primary sm:text-3xl">{t(`tour.${key}.title`)}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">{t(`tour.${key}.description`)}</p>
            </div>

            <div className="group relative animate-fade-up">
              <div aria-hidden className="absolute -inset-4 -z-10 rounded-[28px] bg-primary/8 blur-2xl" />
              <div className="surface-soft overflow-hidden">
                <div className="flex items-center gap-1.5 bg-surface-secondary/68 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                </div>
                <img src={image} alt={t(`tour.${key}.alt`)} loading="lazy" className="w-full" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="border-y border-border/8 bg-surface/42">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">
              <MousePointerClick className="h-3.5 w-3.5" />
              {t("steps.badge")}
            </span>
            <h2 className="mx-auto mt-4 max-w-lg text-2xl font-bold text-text-primary sm:text-3xl">
              {t("steps.title")}
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, key }, index) => (
              <div key={key} className="surface-soft relative p-5">
                <span className="font-mono text-xs font-medium text-text-muted">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-[15px] font-bold text-text-primary">{t(`steps.${key}.label`)}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{t(`steps.${key}.text`)}</p>
                {index < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-text-muted lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="surface-highlight relative overflow-hidden px-6 py-14 text-center sm:px-16">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_44%)]" />
          <div className="relative">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-white">
              <Wallet className="h-5 w-5" />
            </span>
            <h2 className="mx-auto mt-5 max-w-md font-display text-2xl font-extrabold text-white sm:text-3xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/66">{t("cta.description")}</p>
            <div className="mt-7">
              <Button
                variant="primary"
                size="large"
                onClick={handleCta}
                icon={<ArrowRight className="h-4 w-4" />}
                iconPlacement="end"
              >
                {isAuthed ? t("cta.buttonAuthed") : t("cta.buttonGuest")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/8 px-4 py-8 text-center text-xs text-text-muted sm:px-6">
        {t("footer")}
      </footer>
    </div>
  );
}
