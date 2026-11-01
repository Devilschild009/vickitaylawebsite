export type CartLine = {
  productId: number;
  sizeId: number;
  quantity: number;
};

export const CART_STORAGE_KEY = "victayla-bag-v1";

export function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDiscount(value: number) {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value);
}

export function salePrice(price: number | null, discountPercent: number) {
  if (price === null || !Number.isFinite(price)) return null;
  return Math.max(0, price * (1 - Math.max(0, Math.min(discountPercent, 100)) / 100));
}

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((line): line is CartLine =>
      Number.isInteger(line?.productId) && line.productId > 0
      && Number.isInteger(line?.sizeId) && line.sizeId > 0
      && Number.isInteger(line?.quantity) && line.quantity > 0,
    ).slice(0, 50);
  } catch {
    return [];
  }
}
