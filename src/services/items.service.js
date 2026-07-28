// Stub — Item CRUD chưa được implement (xem roadmap trong CLAUDE.md).
import { TABLES } from "../shared/constants/tables";

function notImplemented() {
  throw new Error(`${TABLES.ITEMS} service not implemented yet`);
}

export async function listItems() {
  notImplemented();
}

export async function createItem() {
  notImplemented();
}

export async function updateItem() {
  notImplemented();
}

export async function deleteItem() {
  notImplemented();
}
