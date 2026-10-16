/** Inventory is stored in base units on products.current_stock. POS converts for pack/box sales. */

export const PRODUCT_PACK_VARIANT_PREFIX = "product-pack:";

export type PackableVariant = {
  is_packing?: boolean | number | null;
  pack_size?: number | null;
  stock_quantity?: number | null;
};

export type PackableProduct = {
  id?: string;
  current_stock?: number | null;
  pack_size?: number | null;
  unit?: string | null;
  sale_price_single?: number | null;
  sale_price_pack?: number | null;
  purchase_price_single?: number | null;
  purchase_price_pack?: number | null;
};

export function getBaseStockUnits(product: PackableProduct): number {
  return Math.max(0, Number(product.current_stock) || 0);
}

export function getProductPackFactor(product: PackableProduct): number | null {
  const packSize = Number(product.pack_size) || 0;
  return packSize > 0 ? packSize : null;
}

export function isProductPackVariantId(variantId?: string | null): boolean {
  return !!variantId && variantId.startsWith(PRODUCT_PACK_VARIANT_PREFIX);
}

export function getVariantPackFactor(product: PackableProduct, variant: PackableVariant): number | null {
  const packSize = Number(variant.pack_size) || 0;
  const isPacking = Boolean(Number(variant.is_packing));

  if (isPacking && packSize > 0) return packSize;

  const productPack = getProductPackFactor(product);
  if (productPack && packSize > 0 && packSize === productPack) return productPack;

  // Legacy rows: strip/box variants without is_packing still sell from base pool
  if (packSize > 1) return packSize;

  return null;
}

/** How many units (packs or base) can be sold for this variant selection. */
export function stockInSellUnit(product: PackableProduct, variant?: PackableVariant | null): number {
  const base = getBaseStockUnits(product);
  if (!variant) return base;

  const factor = getVariantPackFactor(product, variant);
  if (factor) return Math.floor(base / factor);

  return Math.max(0, Number(variant.stock_quantity) || 0);
}

/** Quantity to subtract from products.current_stock (base units). */
export function baseUnitsToDecrement(
  product: PackableProduct,
  variant: PackableVariant | null | undefined,
  sellQty: number,
  variantId?: string | null
): number {
  if (isProductPackVariantId(variantId)) {
    const factor = getProductPackFactor(product);
    return sellQty * (factor || 1);
  }

  const factor = variant ? getVariantPackFactor(product, variant) : null;
  if (factor) return sellQty * factor;

  return sellQty;
}

export function shouldDecrementVariantStock(
  product: PackableProduct,
  variant: PackableVariant | null | undefined,
  variantId?: string | null
): boolean {
  if (!variant || isProductPackVariantId(variantId)) return false;
  return getVariantPackFactor(product, variant) === null;
}

/** How many base units to add to products.current_stock from a purchase line. */
export function baseUnitsFromPurchase(
  product: PackableProduct,
  variant: PackableVariant | null | undefined,
  variantId: string | null | undefined,
  purchaseQty: number,
  bonusQty = 0
): number {
  const qty = purchaseQty + bonusQty;
  if (!variantId) return qty;

  if (isProductPackVariantId(variantId)) {
    const factor = getProductPackFactor(product) || 1;
    return qty * factor;
  }

  const factor = variant ? getVariantPackFactor(product, variant) : null;
  if (factor) return qty * factor;

  return 0;
}

export function usesSeparateVariantStockPool(
  product: PackableProduct,
  variant: PackableVariant | null | undefined,
  variantId: string | null | undefined
): boolean {
  if (!variantId || !variant) return false;
  if (isProductPackVariantId(variantId)) return false;
  return getVariantPackFactor(product, variant) === null;
}

/** Undo one weighted-average purchase line when voiding a PO (cost only). */
export function reverseWeightedUnitCost(
  stockBeforeVoid: number,
  avgUnitCost: number,
  unitsRemoved: number,
  lineTotalCost: number
): number {
  if (unitsRemoved <= 0 || stockBeforeVoid <= 0) return avgUnitCost;
  const nextStock = stockBeforeVoid - unitsRemoved;
  if (nextStock <= 0) return avgUnitCost;
  const prevTotal = stockBeforeVoid * avgUnitCost;
  return Math.round(((prevTotal - lineTotalCost) / nextStock) * 10000) / 10000;
}
