/** POS sales/cashier data must not persist in browser storage (localStorage/sessionStorage). */

const POS_LOCAL_PREFIXES = ["held_carts_", "pos_price_edit_", "pos_layout_view_"];

export function clearPosBrowserCache(shopId?: string | null) {
  if (typeof window === "undefined") return;

  if (shopId) {
    for (const prefix of POS_LOCAL_PREFIXES) {
      localStorage.removeItem(`${prefix}${shopId}`);
    }
    return;
  }

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (POS_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}
