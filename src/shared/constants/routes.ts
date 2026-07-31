export const ROUTES = {
  LOGIN: "/login",
  LOCATIONS: "/locations",
  ITEMS: "/items",
  UNITS: "/units",
  PLANS: "/plans",
  PLAN_DETAIL: "/plans/:planId",
} as const;

// Dùng cho <Link>/navigate() tới trang chi tiết 1 kế hoạch.
export function planPath(planId: string): string {
  return `/plans/${planId}`;
}
