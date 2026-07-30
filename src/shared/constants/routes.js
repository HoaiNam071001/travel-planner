export const ROUTES = Object.freeze({
  LOGIN: "/login",
  LOCATIONS: "/locations",
  ITEMS: "/items",
  UNITS: "/units",
  PLANS: "/plans",
  PLAN_DETAIL: "/plans/:planId",
});

// Dùng cho <Link>/navigate() tới trang chi tiết 1 kế hoạch.
export function planPath(planId) {
  return `/plans/${planId}`;
}
