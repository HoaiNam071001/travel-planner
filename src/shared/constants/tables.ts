export const TABLES = {
  USERS: "users",
  LOCATIONS: "locations",
  ITEMS: "items",
  ITEM_LOCATIONS: "item_locations",
  UNITS: "units",
  UNIT_TYPES: "unit_types",
  PLANS: "plans",
  UNIT_ROUTES: "unit_routes",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
