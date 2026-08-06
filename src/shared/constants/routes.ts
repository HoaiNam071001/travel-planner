export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  LOCATIONS: "/locations",
  ITEMS: "/items",
  UNITS: "/units",
  PLANS: "/plans",
  PLAN_DETAIL: "/plans/:planId",
  /** Link xem trước công khai, không cần đăng nhập — xem `SharedPlanPage`. */
  PLAN_PREVIEW: "/p/:token",
} as const;

// Dùng cho <Link>/navigate() tới trang chi tiết 1 kế hoạch.
export function planPath(planId: string): string {
  return `/plans/${planId}`;
}

// Dùng cho link xem trước công khai (`/p/:token`) của 1 kế hoạch đã bật chia sẻ.
export function planPreviewPath(token: string): string {
  return `/p/${token}`;
}
