import { useCallback, useEffect, useState } from "react";
import { api, Product } from "../api";

type Props = {
  value: string;
  onChange: (slug: string) => void;
  allowAll?: boolean;
  className?: string;
};

/**
 * Shared product picker. Stays in sync when products are created or deleted
 * elsewhere by listening to the "kle:products-changed" window event.
 */
export default function ProductSelect({ value, onChange, allowAll = true, className }: Props) {
  const [products, setProducts] = useState<Product[]>([]);

  const reload = useCallback(async () => {
    try {
      const next = await api.products.list();
      setProducts(next);
      if (value && !next.some((product) => product.slug === value)) {
        onChange(allowAll ? "" : next[0]?.slug ?? "");
      }
    } catch (e) {
      console.error(e);
    }
  }, [allowAll, onChange, value]);

  useEffect(() => {
    void reload();
    const h = () => void reload();
    window.addEventListener("kle:products-changed", h);
    return () => window.removeEventListener("kle:products-changed", h);
  }, [reload]);

  return (
    <select
      className={
        className ??
        "rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowAll && <option value="">All products</option>}
      {products.map((p) => (
        <option key={p.id} value={p.slug}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

/** Notify every ProductSelect on the page that the product list changed. */
export function notifyProductsChanged() {
  window.dispatchEvent(new Event("kle:products-changed"));
}
