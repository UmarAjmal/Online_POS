import { dbClient } from "@/lib/dbClient";

export async function runDbRpc(
  client: typeof dbClient,
  fn: string,
  args: Record<string, unknown> = {}
) {
  switch (fn) {
    case "increment_party_balance": {
      const pId = String(args.p_id ?? "");
      const amount = Number(args.amount ?? 0);
      if (!pId) throw new Error("Party id is required");
      await dbClient.run(
        `UPDATE parties SET current_balance = COALESCE(current_balance, 0) + ? WHERE id = ?`,
        [amount, pId]
      );
      return null;
    }

    case "decrement_product_stock": {
      const pId = String(args.p_id ?? "");
      const qty = Number(args.qty ?? 0);
      if (!pId) throw new Error("Product id is required");
      await dbClient.run(
        `UPDATE products SET current_stock = COALESCE(current_stock, 0) - ? WHERE id = ?`,
        [qty, pId]
      );
      return null;
    }

    case "decrement_variant_stock": {
      const vId = String(args.v_id ?? "");
      const qty = Number(args.qty ?? 0);
      if (!vId) throw new Error("Variant id is required");
      await dbClient.run(
        `UPDATE product_variants SET stock_quantity = COALESCE(stock_quantity, 0) - ? WHERE id = ?`,
        [qty, vId]
      );
      return null;
    }

    case "create_staff_user": {
      const id = "user-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      await dbClient.run(
        `INSERT INTO user_profiles (id, shop_id, name, role, email, password, permissions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          String(args.staff_shop_id ?? ""),
          String(args.staff_name ?? ""),
          String(args.staff_role ?? "staff"),
          String(args.staff_email ?? "").trim(),
          String(args.staff_password ?? ""),
          JSON.stringify(args.staff_permissions ?? {}),
        ]
      );
      return id;
    }

    case "update_staff_user": {
      const staffId = String(args.staff_id ?? "");
      if (!staffId) throw new Error("Staff id is required");

      const permissions = JSON.stringify(args.staff_permissions ?? {});
      const password = args.staff_password ? String(args.staff_password) : null;

      if (password) {
        await dbClient.run(
          `UPDATE user_profiles
           SET name = ?, role = ?, permissions = ?, password = ?
           WHERE id = ?`,
          [String(args.staff_name ?? ""), String(args.staff_role ?? "staff"), permissions, password, staffId]
        );
      } else {
        await dbClient.run(
          `UPDATE user_profiles
           SET name = ?, role = ?, permissions = ?
           WHERE id = ?`,
          [String(args.staff_name ?? ""), String(args.staff_role ?? "staff"), permissions, staffId]
        );
      }
      return null;
    }

    case "delete_staff_user": {
      const staffId = String(args.staff_id ?? "");
      if (!staffId) throw new Error("Staff id is required");
      await dbClient.run(
        `DELETE FROM user_profiles WHERE id = ? AND role != 'superadmin'`,
        [staffId]
      );
      return null;
    }

    default:
      throw new Error(`Unknown RPC function: ${fn}`);
  }
}
