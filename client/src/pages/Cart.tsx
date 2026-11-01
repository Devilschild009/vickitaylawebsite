import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, Minus, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { formatDiscount, formatNaira, salePrice } from "@/lib/store";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCart();
  const details = trpc.storefront.cartDetails.useQuery(
    { productIds: [...new Set(items.map((item) => item.productId))] },
    { enabled: items.length > 0 },
  );
  const products = details.data ?? [];
  const lines = items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const size = product?.sizes.find((entry) => entry.id === item.sizeId);
    const unit = product ? salePrice(product.price, product.discountPercent) : null;
    return { item, product, size, unit, subtotal: unit === null ? null : unit * item.quantity };
  });
  const total = lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0);

  return (
    <section className="bag-page section-pad">
      <div className="detail-back-row"><Link className="back-link" href="/#collections"><ArrowLeft size={14} /> Continue exploring</Link><span className="eyebrow">Your Victayla bag</span></div>
      <div className="bag-heading"><div><p className="eyebrow">Collected for you</p><h1>Your <em>bag.</em></h1></div><span>{items.reduce((count, item) => count + item.quantity, 0)} pieces</span></div>
      {items.length === 0 ? <div className="empty-bag"><p className="eyebrow">A good place to begin</p><h2>Your bag is<br /><em>waiting.</em></h2><p className="body-copy">The pieces you love will live here.</p><Link className="button button-dark" href="/#collections">Explore the goods <ArrowUpRight size={14} /></Link></div> : details.isLoading ? <div className="loading-note">Gathering your pieces…</div> : (
        <div className="bag-layout">
          <div className="bag-lines">
            {lines.map(({ item, product, size, unit, subtotal }) => {
              if (!product || !size) return <article className="bag-line bag-line-unavailable" key={`${item.productId}-${item.sizeId}`}>
                <div className="bag-line-image"><span>V</span></div><div className="bag-line-copy"><p className="eyebrow">No longer available</p><h2>Piece unavailable</h2><p>This item or size can no longer be found in the collection.</p><button className="text-button" type="button" onClick={() => removeItem(item.productId, item.sizeId)}>Remove <Trash2 size={13} /></button></div>
              </article>;
              return <article className="bag-line" key={`${item.productId}-${item.sizeId}`}>
                <Link className="bag-line-image" href={`/products/${product.slug}`}>{product.images[0] ? <img src={product.images[0].imageUrl} alt={product.images[0].altText || product.name} /> : <span>V</span>}</Link>
                <div className="bag-line-copy"><p className="eyebrow">Victayla</p><h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2><p>Size: {size.label}</p>
                  {unit === null ? <span className="price-pending">Price to be added</span> : <span className="bag-unit-price">{product.discountPercent > 0 && product.price !== null && <s>{formatNaira(product.price)}</s>} {formatNaira(unit)}</span>}
                  {product.discountPercent > 0 && <span className="discount-note">{formatDiscount(product.discountPercent)}% off</span>}
                </div>
                <div className="bag-line-end"><div className="quantity-control"><button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(item.productId, item.sizeId, item.quantity - 1, size.stock)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" aria-label="Increase quantity" disabled={item.quantity >= size.stock} onClick={() => updateQuantity(item.productId, item.sizeId, item.quantity + 1, size.stock)}><Plus size={13} /></button></div><strong>{subtotal === null ? "—" : formatNaira(subtotal)}</strong><button className="text-button remove-item" type="button" onClick={() => removeItem(item.productId, item.sizeId)}>Remove <Trash2 size={13} /></button></div>
              </article>;
            })}
          </div>
          <aside className="bag-summary"><p className="eyebrow">A little summary</p><div><span>Subtotal</span><strong>{formatNaira(total)}</strong></div><div><span>Discounts</span><span>Applied to eligible pieces</span></div><div className="bag-total"><span>Total</span><strong>{formatNaira(total)}</strong></div><p className="checkout-note">Your bag is saved on this device. Online payment checkout can be connected when you choose a payment provider.</p><Link className="button button-light" href="/#collections">Keep exploring <ArrowUpRight size={14} /></Link></aside>
        </div>
      )}
    </section>
  );
}
