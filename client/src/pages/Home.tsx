import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import NotFound from "./NotFound";

export default function Home() {
  const collections = trpc.storefront.collections.useQuery();
  const siteAssets = trpc.storefront.siteAssets.useQuery();
  const heroDesktop = siteAssets.data?.["hero-desktop"] ?? "/images/victayla-desktop.jpg";
  const heroMobile = siteAssets.data?.["hero-mobile"] ?? "/images/victayla-mobile.jpg";

  return (
    <>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <picture className="hero-picture">
          <source media="(max-width: 700px)" srcSet={heroMobile} />
          <img className="hero-image" src={heroDesktop} alt="Victayla's sunlit editorial fashion setting" />
        </picture>
        <div className="hero-tint" />
        <div className="hero-content">
          <p className="eyebrow light">Timeless fashion<br />for every you</p>
          <span className="hero-rule" />
          <h1 id="hero-title">The art of<br /><em>quiet allure.</em></h1>
          <p className="hero-copy">Thoughtful silhouettes, tactile fabrics<br className="desktop-only" /> and a palette borrowed from golden hour.</p>
          <Link className="button button-light" href="/#collections">Explore the goods <ArrowUpRight size={14} /></Link>
        </div>
        <div className="hero-footer"><span>Est. 2024 · Lagos / Everywhere</span><a href="#collections"><span className="scroll-line" /> Scroll to discover</a></div>
      </section>

      <section className="intro section-pad" id="story">
        <div className="intro-side"><span className="section-number">01</span><span className="hairline" /><span>New season</span></div>
        <div className="intro-main">
          <p className="eyebrow">A softer kind of statement</p>
          <h2>Designed for the<br /><em>moments between.</em></h2>
          <p className="body-copy">Victayla is a wardrobe of silhouettes that let you arrive as yourself. Considered lines and pieces chosen for how they make you feel, wherever the day takes you.</p>
          <a className="text-link" href="#collections">Discover your edit <ArrowUpRight size={13} /></a>
        </div>
      </section>

      <section className="collections section-pad" id="collections" aria-labelledby="collections-title">
        <div className="section-heading">
          <div><p className="eyebrow">From the collection</p><h2 id="collections-title">The <em>goods.</em></h2></div>
          <span className="section-note">{collections.data?.length ?? 5} signature edits · made for every you</span>
        </div>
        {collections.isLoading ? <div className="loading-note">Opening the collection…</div> : collections.isError ? (
          <div className="error-note" role="alert">The collection could not be loaded. <button type="button" onClick={() => void collections.refetch()}>Try again</button></div>
        ) : !collections.data ? <NotFound /> : (
          <div className="goods-grid">
            {collections.data.map((collection, index) => (
              <Link className="goods-card" href={`/collections/${collection.slug}`} key={collection.id}>
                <div className={`goods-art ${collection.imageUrl ? "has-image" : "is-placeholder"}`}>
                  {collection.imageUrl ? <img className="goods-image" src={collection.imageUrl} alt={`${collection.title} collection`} loading="lazy" /> : <div className="collection-placeholder"><span className="placeholder-monogram">V</span><span>New chapter</span></div>}
                  <span className="art-label">{String(index + 1).padStart(2, "0")} / {String(collections.data.length).padStart(2, "0")}</span>
                </div>
                <div className="goods-copy"><h3>{collection.title}</h3><p>{collection.tagline}</p><span className="explore-label">Explore <ArrowUpRight size={14} /></span></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="manifesto section-pad">
        <span className="manifesto-mark">V</span>
        <p className="eyebrow light">An invitation to arrive as yourself</p>
        <h2>Quietly considered.<br /><em>Entirely you.</em></h2>
        <Link className="text-link light" href="/#collections">Find your next favourite <ArrowUpRight size={13} /></Link>
      </section>
    </>
  );
}
