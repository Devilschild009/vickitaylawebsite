import { useState } from "react";
import { Link } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { formatDiscount, formatNaira, salePrice } from "@/lib/store";
import ImageLightbox from "./ImageLightbox";

type RouterOutput = inferRouterOutputs<AppRouter>;
type StoreProduct = NonNullable<RouterOutput["storefront"]["collection"]>["products"][number];

export default function ProductCard({ product }: { product: StoreProduct }) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const image = product.images[0];
  const current = salePrice(product.price, product.discountPercent);

  return (
    <article className="product-card">
      <div className="product-art">
        {image ? (
          <button className="product-image-button" type="button" onClick={() => setZoomOpen(true)} aria-label={`Enlarge image of ${product.name}`}>
            <img src={image.imageUrl} alt={image.altText || product.name} loading="lazy" />
          </button>
        ) : (
          <div className="product-art-placeholder"><span>Victayla</span></div>
        )}
        {product.discountPercent > 0 && product.price !== null && <span className="sale-badge">-{formatDiscount(product.discountPercent)}%</span>}
        {product.price === null && <span className="product-status-badge">Price pending</span>}
      </div>
      <div className="product-copy">
        <div>
          <p className="product-kicker">{product.sizes.some((size) => size.stock > 0) ? "Available now" : "New edit"}</p>
          <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
          <p className="product-price">
            {current === null ? <span className="price-pending">Price to be added</span> : <>
              {product.discountPercent > 0 && product.price !== null && <s>{formatNaira(product.price)}</s>}
              <strong>{formatNaira(current)}</strong>
            </>}
          </p>
        </div>
        <Link className="text-link-small" href={`/products/${product.slug}`}>View piece <span aria-hidden="true">↗</span></Link>
      </div>
      {zoomOpen && image && <ImageLightbox src={image.imageUrl} alt={image.altText || product.name} onClose={() => setZoomOpen(false)} />}
    </article>
  );
}
