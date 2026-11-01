import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, Minus, Plus, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { formatDiscount, formatNaira, salePrice } from "@/lib/store";
import ImageLightbox from "@/components/ImageLightbox";
import NotFound from "./NotFound";

export default function ProductPage({ slug }: { slug: string }) {
  const result = trpc.storefront.product.useQuery({ slug });
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  if (result.isLoading) return <div className="page-loading">Finding your piece…</div>;
  if (result.error?.data?.code === "NOT_FOUND" || result.data === null) return <NotFound />;
  if (result.isError) return <div className="page-loading error-note" role="alert">This piece could not be opened. <button type="button" onClick={() => void result.refetch()}>Try again</button></div>;
  if (!result.data) return <NotFound />;

  const product = result.data;
  const image = product.images[Math.min(activeImage, Math.max(0, product.images.length - 1))];
  const chosenSize = product.sizes.find((size) => size.id === selectedSizeId && size.stock > 0);
  const currentPrice = salePrice(product.price, product.discountPercent);

  const handleAdd = () => {
    if (!chosenSize) { toast.error("Please choose an available size first."); return; }
    if (currentPrice === null) { toast.error("A price is not set for this piece yet."); return; }
    if (addItem(product.id, chosenSize.id, chosenSize.stock)) toast.success(`${product.name} added to your bag.`);
    else toast.error("That size is currently unavailable.");
  };

  return (
    <section className="product-detail section-pad">
      <div className="detail-back-row"><Link className="back-link" href={`/collections/${product.collection?.slug ?? "denim"}`}><ArrowLeft size={14} /> {product.collection?.title ?? "The collection"}</Link><span className="eyebrow">The Victayla edit</span></div>
      <div className="product-detail-layout">
        <div className="product-gallery">
          <div className="product-main-image">
            {image ? <button type="button" className="zoom-image-button" onClick={() => setZoomOpen(true)} aria-label={`View larger image of ${product.name}`}><img src={image.imageUrl} alt={image.altText || product.name} /><span><ZoomIn size={15} /> View larger</span></button> : <div className="product-art-placeholder"><span>Victayla</span></div>}
            {product.discountPercent > 0 && product.price !== null && <span className="sale-badge">-{formatDiscount(product.discountPercent)}%</span>}
          </div>
          {product.images.length > 1 && <div className="product-thumbnails">{product.images.map((item, index) => <button className={index === activeImage ? "is-selected" : ""} type="button" key={item.id} onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`}><img src={item.imageUrl} alt={item.altText || `${product.name}, view ${index + 1}`} /></button>)}</div>}
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">{product.collection?.title ?? "The collection"}</p>
          <h1>{product.name}</h1>
          <div className="detail-price">
            {currentPrice === null ? <span className="price-pending">Price to be added</span> : <>
              {product.discountPercent > 0 && product.price !== null && <s>{formatNaira(product.price)}</s>}
              <strong>{formatNaira(currentPrice)}</strong>
              {product.discountPercent > 0 && <span className="discount-note">{formatDiscount(product.discountPercent)}% off</span>}
            </>}
          </div>
          <p className="product-description">{product.description || "A considered piece from Victayla."}</p>
          <div className="size-heading"><span>Choose your size</span><span className="size-note">Select before adding to bag</span></div>
          <div className="size-options">
            {product.sizes.length ? product.sizes.map((size) => <button type="button" key={size.id} disabled={size.stock < 1} aria-pressed={selectedSizeId === size.id} className={`${selectedSizeId === size.id ? "is-selected" : ""} ${size.stock < 1 ? "is-unavailable" : ""}`} onClick={() => setSelectedSizeId(size.id)}>{size.label}{size.stock < 1 && <span className="sr-only"> — sold out</span>}</button>) : <p className="size-note">Sizes will be added soon.</p>}
          </div>
          <button className="button button-dark add-to-bag" type="button" onClick={handleAdd} disabled={!chosenSize || currentPrice === null}><span>Add to bag</span><ArrowUpRight size={15} /></button>
          {(currentPrice === null || product.sizes.length === 0) && <p className="setup-note">Price and size availability will be set before this piece can be purchased.</p>}
          <div className="product-attributes"><div><span>Designed with intention</span><span>Made for every you</span></div><div><span>Collection</span><Link href={`/collections/${product.collection?.slug ?? "denim"}`}>{product.collection?.title ?? "Explore"} <ArrowUpRight size={12} /></Link></div></div>
        </div>
      </div>
      {zoomOpen && image && <ImageLightbox src={image.imageUrl} alt={image.altText || product.name} onClose={() => setZoomOpen(false)} />}
    </section>
  );
}
