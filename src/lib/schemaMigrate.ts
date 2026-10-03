import type Database from "better-sqlite3";
import fs from "fs";
import path from "path";

function parseSchemaColumns(sql: string): Map<string, Map<string, string>> {
  const tables = new Map<string, Map<string, string>>();
  const re = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"))
      .join(" ");

    const cols = new Map<string, string>();
    for (const part of body.split(",").map((p) => p.trim())) {
      const colMatch = part.match(/^(\w+)\s+(.+)$/i);
      if (!colMatch) continue;
      const name = colMatch[1];
      if (name === "PRIMARY" || name === "FOREIGN" || name === "UNIQUE" || name === "CONSTRAINT") continue;
      cols.set(name, colMatch[2]);
    }
    tables.set(tableName, cols);
  }

  return tables;
}

function migrationType(def: string): string {
  return def
    .replace(/\bPRIMARY\s+KEY\b/gi, "")
    .replace(/\bNOT\s+NULL\b/gi, "")
    .replace(/\bUNIQUE\b/gi, "")
    .replace(/\bDEFAULT\s+CURRENT_TIMESTAMP\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function migrateColumns(db: Database.Database, schemaSql: string) {
  const expected = parseSchemaColumns(schemaSql);

  for (const [table, cols] of expected) {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!existing.length) continue;

    const existingNames = new Set(existing.map((c) => c.name));
    for (const [colName, colDef] of cols) {
      if (existingNames.has(colName)) continue;
      const type = migrationType(colDef);
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${type}`);
      } catch (err) {
        console.warn(`[SQLite] Could not add ${table}.${colName}:`, err);
      }
    }
  }
}

export function runFullSchema(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), "src", "lib", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);
  migrateColumns(db, schemaSql);
}
