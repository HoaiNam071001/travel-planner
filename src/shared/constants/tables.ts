export const TABLES = {
  USERS: "users",
  LOCATIONS: "locations",
  ITEMS: "items",
  ITEM_LOCATIONS: "item_locations",
  UNITS: "units",
  UNIT_TYPES: "unit_types",
  PLANS: "plans",
  UNIT_ROUTES: "unit_routes",
  PLAN_COLLABORATORS: "plan_collaborators",
  PLAN_EXPENSES: "plan_expenses",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
