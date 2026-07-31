// Stub — tính toán/lưu route giữa các item trong unit chưa được implement
// (xem roadmap trong CLAUDE.md, bước gọi OpenRouteService).
import { TABLES } from "../shared/constants/tables";
import type { Id, UnitRoute } from "../shared/types/models";

function notImplemented(): never {
  throw new Error(`${TABLES.UNIT_ROUTES} service not implemented yet`);
}

export async function getRouteForUnit(_unitId: Id): Promise<UnitRoute> {
  return notImplemented();
}

export async function upsertRouteForUnit(_route: UnitRoute): Promise<UnitRoute> {
  return notImplemented();
}
