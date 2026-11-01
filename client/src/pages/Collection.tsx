import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import NotFound from "./NotFound";

export default function CollectionPage({ slug }: { slug: string }) {
  const result = trpc.storefront.collection.useQuery({ slug });

  if (result.isLoading) return <div className="page-loading">Opening this edit…</div>;
  if (result.error?.data?.code === "NOT_FOUND" || result.data === null) return <NotFound />;
  if (result.isError) return <div className="page-loading error-note" role="alert">This edit could not be opened. <button type="button" onClick={() => void result.refetch()}>Try again</button></div>;
  if (!result.data) return <NotFound />;

  const { collection, products } = result.data;
  return (
    <>
      <section className="collection-hero">
        {collection.imageUrl && <img src={collection.imageUrl} alt="" className="collection-hero-image" />}
        <div className="collection-hero-tint" />
        <div className="collection-hero-copy">
          <Link className="back-link light" href="/#collections"><ArrowLeft size={14} /> All edits</Link>
          <p className="eyebrow light">The collection · {String(collection.sortOrder).padStart(2, "0")}</p>
          <h1>{collection.title}</h1>
          <p className="collection-tagline">{collection.tagline}</p>
        </div>
      </section>
      <section className="collection-products section-pad">
        <div className="collection-intro">
          <div><p className="eyebrow">A considered edit</p><h2>{collection.tagline || collection.title}</h2></div>
          <p className="body-copy">{collection.description || "Discover the pieces in this collection."}</p>
        </div>
        <div className="collection-toolbar"><span>{products.length} {products.length === 1 ? "piece" : "pieces"}</span><span>Made to be worn, made to be yours</span></div>
        {products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : (
          <div className="empty-collection">
            <span className="eyebrow">A little room for what’s next</span>
            <h2>Something lovely<br /><em>is on its way.</em></h2>
            <p className="body-copy">New pieces for this edit will appear here as soon as they are ready.</p>
            <Link className="button button-dark" href="/#collections">Explore the other edits <ArrowUpRight size={14} /></Link>
          </div>
        )}
      </section>
    </>
  );
}
