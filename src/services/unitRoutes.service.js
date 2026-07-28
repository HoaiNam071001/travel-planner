// Stub — tính toán/lưu route giữa các item trong unit chưa được implement
// (xem roadmap trong CLAUDE.md, bước gọi OpenRouteService).
import { TABLES } from "../shared/constants/tables";

function notImplemented() {
  throw new Error(`${TABLES.UNIT_ROUTES} service not implemented yet`);
}

export async function getRouteForUnit() {
  notImplemented();
}

export async function upsertRouteForUnit() {
  notImplemented();
}
