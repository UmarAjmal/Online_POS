export type Embed = {
  relation: string;
  alias?: string;
  fkHint?: string;
  columns: string;
  nested: Embed[];
  isMany?: boolean;
};

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of input) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function parseSelect(select: string): { columns: string[]; embeds: Embed[] } {
  const trimmed = (select || "*").trim();
  if (trimmed === "*") {
    return { columns: ["*"], embeds: [] };
  }

  const columns: string[] = [];
  const embeds: Embed[] = [];

  for (const part of splitTopLevel(trimmed)) {
    // PostgREST formats:
    // 1. alias:relation!fk_name ( cols )
    // 2. alias:relation ( cols )
    // 3. relation!fk_name ( cols )
    // 4. relation ( cols )
    const embedMatch = part.match(/^(?:([\w]+):)?([\w]+)(?:!([\w]+))?\s*\(([\s\S]+)\)$/);
    if (embedMatch) {
      const alias = embedMatch[1];
      const relation = embedMatch[2];
      const fkHint = embedMatch[3];
      const inner = parseSelect(embedMatch[4]);
      embeds.push({
        relation,
        alias,
        fkHint,
        columns: inner.columns.length ? inner.columns.join(", ") : "*",
        nested: inner.embeds,
      });
    } else {
      columns.push(part);
    }
  }

  return { columns, embeds };
}

const PARENT_FK: Record<string, Record<string, { childFk: string; parentFk?: string; isMany?: boolean }>> = {
  units: {
    units: { childFk: "id", parentFk: "parent_unit_id", isMany: false },
    parent_unit: { childFk: "id", parentFk: "parent_unit_id", isMany: false },
  },
  products: {
    product_variants: { childFk: "product_id", isMany: true },
    product_barcodes: { childFk: "product_id", isMany: true },
    product_batches: { childFk: "product_id", isMany: true },
    product_imeis: { childFk: "product_id", isMany: true },
    formulations: { childFk: "id", parentFk: "formulation_id", isMany: false },
    categories: { childFk: "id", parentFk: "category_id", isMany: false },
    brands: { childFk: "id", parentFk: "brand_id", isMany: false },
    units: { childFk: "id", parentFk: "unit_id", isMany: false },
  },
  product_variants: {
    product_barcodes: { childFk: "variant_id", isMany: true },
  },
  restaurant_deals: {
    restaurant_deal_items: { childFk: "deal_id", isMany: true },
  },
  restaurant_menu_sizes: {
    products: { childFk: "id", parentFk: "product_id", isMany: false },
  },
  payroll_slips: {
    user_profiles: { childFk: "id", parentFk: "staff_id", isMany: false },
  },
  invoice_items: {
    invoices: { childFk: "id", parentFk: "invoice_id", isMany: false },
    products: { childFk: "id", parentFk: "product_id", isMany: false },
  },
  purchase_order_items: {
    purchase_orders: { childFk: "id", parentFk: "purchase_order_id", isMany: false },
    products: { childFk: "id", parentFk: "product_id", isMany: false },
  },
  product_batches: {
    products: { childFk: "id", parentFk: "product_id", isMany: false },
  },
  stock: {
    products: { childFk: "id", parentFk: "product_id", isMany: false },
  },
  invoices: {
    parties: { childFk: "id", parentFk: "party_id", isMany: false },
    invoice_items: { childFk: "invoice_id", isMany: true },
    user_profiles: { childFk: "id", parentFk: "created_by", isMany: false },
  },
  purchase_orders: {
    parties: { childFk: "id", parentFk: "supplier_id", isMany: false },
    purchase_order_items: { childFk: "purchase_order_id", isMany: true },
  },
};

type QueryAllFn = (sql: string, params: unknown[]) => Promise<any[]>;

export async function attachEmbeds(
  queryAll: QueryAllFn,
  parentTable: string,
  rows: any[],
  embeds: Embed[]
): Promise<any[]> {
  if (!rows.length || !embeds.length) return rows;

  const result: any[] = [];
  for (const row of rows) {
    const next = { ...row };
    for (const embed of embeds) {
      const aliasKey = embed.alias || embed.relation;
      let map = PARENT_FK[parentTable]?.[aliasKey] || PARENT_FK[parentTable]?.[embed.relation];

      if (!map && embed.fkHint && embed.fkHint !== "inner" && embed.fkHint !== "left" && embed.fkHint !== "right") {
        map = { childFk: "id", parentFk: embed.fkHint, isMany: false };
      }

      if (!map) {
        const possibleParentFk = `${embed.relation.replace(/s$/, "")}_id`;
        if (possibleParentFk in row) {
          map = { childFk: "id", parentFk: possibleParentFk, isMany: false };
        } else {
          const possibleChildFk = `${parentTable.replace(/s$/, "")}_id`;
          map = { childFk: possibleChildFk, isMany: true };
        }
      }

      let sql = `SELECT ${embed.columns} FROM ${embed.relation} WHERE `;
      const params: unknown[] = [];

      if (map.parentFk) {
        const val = row[map.parentFk];
        if (val === null || val === undefined || val === "") {
          next[aliasKey] = map.isMany ? [] : null;
          continue;
        }
        sql += `${map.childFk} = ?`;
        params.push(val);
      } else {
        sql += `${map.childFk} = ?`;
        params.push(row.id);
      }

      const children = await queryAll(sql, params);
      const withNested = await attachEmbeds(queryAll, embed.relation, children, embed.nested);

      const isMany = embed.isMany !== undefined ? embed.isMany : map.isMany !== undefined ? map.isMany : true;
      next[aliasKey] = isMany ? withNested : withNested[0] || null;
    }
    result.push(next);
  }
  return result;
}
