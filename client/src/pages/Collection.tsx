import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import NotFound from "./NotFound";

type Collection = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
};

type LocalProduct = {
  id: number;
  collectionId: number;
  slug: string;
  name: string;
  description: string;
  price: number | null;
  discountPercent: number;
  isPublished: boolean;
  sortOrder: number;
  imageUrl?: string;
  images: Array<{
    id: number;
    productId: number;
    imageUrl: string;
    altText: string;
    sortOrder: number;
  }>;
  sizes: Array<{
    id: number;
    productId: number;
    label: string;
    stock: number;
    sortOrder: number;
  }>;
};

const collections: Collection[] = [
  {
    id: 1,
    slug: "denim",
    title: "The Denim Diaries",
    tagline: "Classic. Versatile. Always you.",
    description: "Denim for the days that become your favourites.",
    imageUrl: "/images/the-denim-diaries.jpg",
    sortOrder: 1,
  },
  {
    id: 2,
    slug: "gowns",
    title: "The Gown Gallery",
    tagline: "For moments that matter.",
    description:
      "Considered silhouettes for celebrations, entrances and evenings worth remembering.",
    imageUrl: "/images/the-gown-gallery.jpg",
    sortOrder: 2,
  },
  {
    id: 3,
    slug: "tops",
    title: "The Top Lane",
    tagline: "Chic tops for every mood.",
    description: "Easy pieces with a little something extra.",
    imageUrl: "/images/the-top-lane.jpg",
    sortOrder: 3,
  },
  {
    id: 4,
    slug: "dresses",
    title: "The Dress Edit",
    tagline: "Effortless elegance, always.",
    description: "One-piece dressing, thoughtfully done.",
    imageUrl: "/images/the-dress-edit.jpg",
    sortOrder: 4,
  },
  {
    id: 5,
    slug: "new-edit",
    title: "New Edit",
    tagline: "Your next signature edit.",
    description: "A new space for the pieces you love.",
    imageUrl: null,
    sortOrder: 5,
  },
];

const products: LocalProduct[] = [
  {
    id: 1,
    collectionId: 1,
    slug: "victayla-the-jeans",
    name: "Victayla The Jeans",
    description:
      "The supplied denim look. Set a price and size availability in the admin area before adding it to the bag.",
    price: null,
    discountPercent: 0,
    isPublished: true,
    sortOrder: 1,
    imageUrl: "/images/denim-product-01.jpg",
    images: [
      {
        id: 1,
        productId: 1,
        imageUrl: "/images/denim-product-01.jpg",
        altText: "Victayla The Jeans",
        sortOrder: 0,
      },
    ],
    sizes: [],
  },
];

export default function CollectionPage({ slug }: { slug: string }) {
  const collection = collections.find((item) => item.slug === slug);

  if (!collection) {
    return <NotFound />;
  }

  const collectionProducts = products.filter(
    (product) =>
      product.collectionId === collection.id && product.isPublished,
  );

  return (
    <>
      <section className="collection-hero">
        {collection.imageUrl && (
          <img
            src={collection.imageUrl}
            alt=""
            className="collection-hero-image"
          />
        )}

        <div className="collection-hero-tint" />

        <div className="collection-hero-copy">
          <Link className="back-link light" href="/#collections">
            <ArrowLeft size={14} /> All edits
          </Link>

          <p className="eyebrow light">
            The collection · {String(collection.sortOrder).padStart(2, "0")}
          </p>

          <h1>{collection.title}</h1>
          <p className="collection-tagline">{collection.tagline}</p>
        </div>
      </section>

      <section className="collection-products section-pad">
        <div className="collection-intro">
          <div>
            <p className="eyebrow">A considered edit</p>
            <h2>{collection.tagline || collection.title}</h2>
          </div>

          <p className="body-copy">
            {collection.description ||
              "Discover the pieces in this collection."}
          </p>
        </div>

        <div className="collection-toolbar">
          <span>
            {collectionProducts.length}{" "}
            {collectionProducts.length === 1 ? "piece" : "pieces"}
          </span>
          <span>Made to be worn, made to be yours</span>
        </div>

        {collectionProducts.length > 0 ? (
          <div className="product-grid">
            {collectionProducts.map((product) => (
              <ProductCard key={product.id} product={product as any} />
            ))}
          </div>
        ) : (
          <div className="empty-collection">
            <span className="eyebrow">A little room for what’s next</span>

            <h2>
              Something lovely
                

              <em>is on its way.</em>
            </h2>

            <p className="body-copy">
              New pieces for this edit will appear here as soon as they are
              ready.
            </p>

            <Link className="button button-dark" href="/#collections">
              Explore the other edits <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
