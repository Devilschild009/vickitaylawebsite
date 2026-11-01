import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CART_STORAGE_KEY, readCart, type CartLine } from "@/lib/store";

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  addItem: (productId: number, sizeId: number, stock: number) => boolean;
  removeItem: (productId: number, sizeId: number) => void;
  updateQuantity: (productId: number, sizeId: number, quantity: number, stock: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => readCart());

  const save = useCallback((next: CartLine[]) => {
    setItems(next);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("victayla-cart-updated"));
    } catch {
      // Keep the in-memory bag usable when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    window.addEventListener("storage", refresh);
    window.addEventListener("victayla-cart-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("victayla-cart-updated", refresh);
    };
  }, []);

  const addItem = useCallback((productId: number, sizeId: number, stock: number) => {
    if (stock < 1) return false;
    const existing = items.find((line) => line.productId === productId && line.sizeId === sizeId);
    const next = existing
      ? items.map((line) => line === existing ? { ...line, quantity: Math.min(stock, line.quantity + 1) } : line)
      : [...items, { productId, sizeId, quantity: 1 }];
    save(next);
    return true;
  }, [items, save]);

  const removeItem = useCallback((productId: number, sizeId: number) => {
    save(items.filter((line) => line.productId !== productId || line.sizeId !== sizeId));
  }, [items, save]);

  const updateQuantity = useCallback((productId: number, sizeId: number, quantity: number, stock: number) => {
    if (quantity < 1) return removeItem(productId, sizeId);
    save(items.map((line) => line.productId === productId && line.sizeId === sizeId
      ? { ...line, quantity: Math.max(1, Math.min(stock, Math.floor(quantity))) }
      : line));
  }, [items, removeItem, save]);

  const clear = useCallback(() => save([]), [save]);
  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((total, line) => total + line.quantity, 0),
    addItem,
    removeItem,
    updateQuantity,
    clear,
  }), [items, addItem, removeItem, updateQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
