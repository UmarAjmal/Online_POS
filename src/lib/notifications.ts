import { createClient } from "@/lib/supabase/client";

export interface SystemNotification {
  id: string;
  shop_id: string;
  user_id?: string | null;
  actor_name: string;
  actor_role: string;
  type: 
    | "transaction_sale" 
    | "transaction_purchase" 
    | "transaction_expense" 
    | "audit_edit" 
    | "audit_delete" 
    | "stock_alert" 
    | "expiry_alert" 
    | "system";
  module: 
    | "pos" 
    | "sales" 
    | "products" 
    | "purchase" 
    | "expenses" 
    | "accounts" 
    | "returns" 
    | "registers" 
    | "staff" 
    | "roles" 
    | "settings";
  title: string;
  message: string;
  severity: "info" | "success" | "warning" | "danger";
  metadata?: Record<string, any>;
  is_read: number;
  created_at: string;
}

export async function createNotification(data: {
  shopId?: string;
  userId?: string | null;
  actorName: string;
  actorRole: string;
  type: SystemNotification["type"];
  module: SystemNotification["module"];
  title: string;
  message: string;
  severity?: "info" | "success" | "warning" | "danger";
  metadata?: Record<string, any>;
}): Promise<boolean> {
  const shopId = data.shopId || "ar-group-shop-001";
  const id = "notif-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);

  try {
    const res = await fetch("/api/sqlite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insert",
        table: "notifications",
        data: {
          id,
          shop_id: shopId,
          user_id: data.userId || null,
          actor_name: data.actorName,
          actor_role: data.actorRole,
          type: data.type,
          module: data.module,
          title: data.title,
          message: data.message,
          severity: data.severity || "info",
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          is_read: 0,
        },
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return false;
  }
}

// Helpers for Transactions and Audit Events
export async function notifySaleTransaction(actorName: string, actorRole: string, invoiceNo: string, amount: number, customerName?: string) {
  return createNotification({
    actorName,
    actorRole,
    type: "transaction_sale",
    module: "pos",
    title: `New Sale Invoice: #${invoiceNo}`,
    message: `${actorName} (${actorRole}) processed checkout of PKR ${amount.toLocaleString()}${customerName ? ` for ${customerName}` : ""}.`,
    severity: "success",
    metadata: { invoiceNo, amount, customerName },
  });
}

export async function notifyPurchaseTransaction(actorName: string, actorRole: string, poNo: string, amount: number, supplierName: string) {
  return createNotification({
    actorName,
    actorRole,
    type: "transaction_purchase",
    module: "purchase",
    title: `Purchase Inward: #${poNo}`,
    message: `Stock worth PKR ${amount.toLocaleString()} received from ${supplierName} by ${actorName}.`,
    severity: "info",
    metadata: { poNo, amount, supplierName },
  });
}

export async function notifyExpenseTransaction(actorName: string, actorRole: string, expenseTitle: string, amount: number, category: string) {
  return createNotification({
    actorName,
    actorRole,
    type: "transaction_expense",
    module: "expenses",
    title: `Expense Logged: ${expenseTitle}`,
    message: `PKR ${amount.toLocaleString()} recorded under category '${category}' by ${actorName}.`,
    severity: "warning",
    metadata: { expenseTitle, amount, category },
  });
}

export async function notifyAuditEdit(actorName: string, actorRole: string, module: SystemNotification["module"], itemName: string, changeSummary: string) {
  return createNotification({
    actorName,
    actorRole,
    type: "audit_edit",
    module,
    title: `Security Audit: ${module.toUpperCase()} Modified`,
    message: `${actorName} (${actorRole}) edited '${itemName}'. Details: ${changeSummary}`,
    severity: "warning",
    metadata: { module, itemName, changeSummary },
  });
}

export async function notifyAuditDelete(actorName: string, actorRole: string, module: SystemNotification["module"], itemName: string, reason?: string) {
  return createNotification({
    actorName,
    actorRole,
    type: "audit_delete",
    module,
    title: `Critical Alert: ${module.toUpperCase()} Deleted`,
    message: `${actorName} (${actorRole}) permanently deleted '${itemName}'${reason ? ` (Reason: ${reason})` : ""}.`,
    severity: "danger",
    metadata: { module, itemName, reason },
  });
}
