import { sqliteClient } from "../sqliteClient";

export function createClient() {
  return sqliteClient as any;
}
