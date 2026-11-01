import { useMemo, useState, type ChangeEvent } from "react";
import { ArrowUpRight, ImagePlus, LogIn, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getBrowserSupabase, isSupabaseConfigured, SUPABASE_STORAGE_BUCKET } from "@/lib/supabase";
import { formatDiscount, formatNaira } from "@/lib/store";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type Outputs = inferRouterOutputs<AppRouter>;
type AdminCollection = Outputs["admin"]["catalog"]["collections"][number];
type AdminProduct = Outputs["admin"]["catalog"]["products"][number];
type ImageValue = { url?: string; contentType?: string; fileName?: string; altText?: string };
type ProductForm = { id?: number; collectionId: string; name: string; description: string; price: string; discountPercent: string; isPublished: boolean; sizesText: string; images: ImageValue[] };
type CollectionForm = { id?: number; title: string; tagline: string; description: string; image?: ImageValue };

const blankProduct = (collectionId = ""): ProductForm => ({ collectionId, name: "", description: "", price: "", discountPercent: "0", isPublished: false, sizesText: "", images: [] });
const blankCollection = (): CollectionForm => ({ title: "", tagline: "", description: "" });

function imageMetadata(file: File): ImageValue {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or AVIF image.");
  }
  if (file.size > 8 * 1024 * 1024) throw new Error("Each image must be 8 MB or smaller.");
  return { contentType: file.type, fileName: file.name, altText: file.name.replace(/\.[^.]+$/, "") };
}

function imageSrc(image: ImageValue) {
  return image.url ?? "";
}

function parseSizes(value: string) {
  return value.split("\n").map((line) => {
    const [label, count] = line.split(",");
    return { label: label?.trim() ?? "", stock: Math.max(0, Number.parseInt((count ?? "0").trim(), 10) || 0) };
  }).filter((size) => size.label);
}

export default function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<"products" | "collections">("products");
  const catalog = trpc.admin.catalog.useQuery(undefined, { enabled: auth.user?.role === "admin", retry: false });
  const utils = trpc.useUtils();
  const [productForm, setProductForm] = useState<ProductForm>(() => blankProduct());
  const [collectionForm, setCollectionForm] = useState<CollectionForm>(blankCollection());
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [collectionEditorOpen, setCollectionEditorOpen] = useState(false);
  const [productSaving, setProductSaving] = useState(false);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loginMode, setLoginMode] = useState<"login" | "reset">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [authWorking, setAuthWorking] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const saveProduct = trpc.admin.saveProduct.useMutation();
  const setVisibility = trpc.admin.setProductVisibility.useMutation();
  const saveCollection = trpc.admin.saveCollection.useMutation();
  const uploadImage = trpc.admin.uploadCatalogImage.useMutation();
  const collections = catalog.data?.collections ?? [];
  const products = catalog.data?.products ?? [];
  const sortedProducts = useMemo(() => products, [products]);

  const beginNewProduct = () => {
    setProductForm(blankProduct(collections[0] ? String(collections[0].id) : ""));
    setProductEditorOpen(true);
  };

  const editProduct = (product: AdminProduct) => {
    setProductForm({
      id: product.id,
      collectionId: String(product.collectionId),
      name: product.name,
      description: product.description ?? "",
      price: product.price === null ? "" : String(product.price),
      discountPercent: String(product.discountPercent ?? 0),
      isPublished: product.isPublished,
      sizesText: product.sizes.map((size) => `${size.label}, ${size.stock}`).join("\n"),
      images: product.images.map((image) => ({ url: image.imageUrl, altText: image.altText })),
    });
    setProductEditorOpen(true);
  };

  const addProductImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploadingImages(true);
    try {
      for (const file of files) {
        const image = imageMetadata(file);
        const stored = await uploadImage.mutateAsync({ folder: "products", fileName: image.fileName!, contentType: image.contentType as "image/jpeg" | "image/png" | "image/webp" | "image/avif" });
        const client = getBrowserSupabase();
        if (!client) throw new Error("Supabase Storage is not configured for this site.");
        const { error } = await client.storage.from(SUPABASE_STORAGE_BUCKET).uploadToSignedUrl(stored.path, stored.token, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        setProductForm((form) => ({ ...form, images: [...form.images, { url: stored.publicUrl, altText: image.altText }] }));
      }
      toast.success(`${files.length} image${files.length === 1 ? "" : "s"} added.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploadingImages(false); }
  };

  const submitProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadingImages) { toast.message("Wait for image uploads to finish."); return; }
    if (!productForm.collectionId) { toast.error("Choose a collection first."); return; }
    const price = productForm.price.trim() ? Number(productForm.price) : null;
    const discountPercent = Number(productForm.discountPercent || 0);
    if (price !== null && (!Number.isFinite(price) || price < 0)) { toast.error("Enter a valid regular price."); return; }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) { toast.error("Discount must be between 0 and 100%."); return; }
    setProductSaving(true);
    try {
      await saveProduct.mutateAsync({
        ...(productForm.id ? { id: productForm.id } : {}),
        collectionId: Number(productForm.collectionId),
        name: productForm.name.trim(),
        description: productForm.description,
        price,
        discountPercent,
        isPublished: productForm.isPublished,
        sizes: parseSizes(productForm.sizesText),
        images: productForm.images,
      });
      await Promise.all([utils.admin.catalog.invalidate(), utils.storefront.collections.invalidate()]);
      toast.success("Product saved.");
      setProductEditorOpen(false);
      setProductForm(blankProduct());
    } catch (error) { toast.error(error instanceof Error ? error.message : "Product could not be saved."); }
    finally { setProductSaving(false); }
  };

  const editCollection = (collection: AdminCollection) => {
    setCollectionForm({ id: collection.id, title: collection.title, tagline: collection.tagline, description: collection.description ?? "", image: collection.imageUrl ? { url: collection.imageUrl, altText: collection.title } : undefined });
    setCollectionEditorOpen(true);
  };

  const chooseCollectionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingImages(true);
    try {
      const image = imageMetadata(file);
      const stored = await uploadImage.mutateAsync({ folder: "collections", fileName: image.fileName!, contentType: image.contentType as "image/jpeg" | "image/png" | "image/webp" | "image/avif" });
      const client = getBrowserSupabase();
      if (!client) throw new Error("Supabase Storage is not configured for this site.");
      const { error } = await client.storage.from(SUPABASE_STORAGE_BUCKET).uploadToSignedUrl(stored.path, stored.token, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setCollectionForm((form) => ({ ...form, image: { url: stored.publicUrl, altText: image.altText } }));
      toast.success("Collection cover uploaded.");
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploadingImages(false); }
  };

  const submitCollection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadingImages) { toast.message("Wait for the image upload to finish."); return; }
    setCollectionSaving(true);
    try {
      await saveCollection.mutateAsync({ ...collectionForm });
      await utils.admin.catalog.invalidate();
      await utils.storefront.collections.invalidate();
      toast.success(collectionForm.id ? "Collection updated." : "Collection added.");
      setCollectionEditorOpen(false);
      setCollectionForm(blankCollection());
    } catch (error) { toast.error(error instanceof Error ? error.message : "Collection could not be saved."); }
    finally { setCollectionSaving(false); }
  };

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthWorking(true);
    try { await auth.signIn(loginEmail, loginPassword); toast.success("You’re signed in."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setAuthWorking(false); }
  };

  const submitReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthWorking(true);
    try { await auth.resetPassword(loginEmail); setResetSent(true); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Password reset could not be sent."); }
    finally { setAuthWorking(false); }
  };

  const submitNewPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthWorking(true);
    try { await auth.updatePassword(newPassword); setNewPassword(""); toast.success("Your password has been updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Password could not be updated."); }
    finally { setAuthWorking(false); }
  };

  if (!isSupabaseConfigured) return <section className="admin-gate section-pad"><p className="eyebrow">Store setup</p><h1>Supabase <em>isn’t connected yet.</em></h1><p className="body-copy">Add the Supabase project URL and public key to the frontend environment before signing in. The deployment guide lists the required settings.</p></section>;
  if (auth.loading) return <div className="page-loading">Checking your sign-in…</div>;
  if (auth.isPasswordRecovery) return <section className="admin-gate section-pad"><p className="eyebrow">Secure account recovery</p><h1>Choose a <em>new password.</em></h1><form className="admin-auth-form" onSubmit={submitNewPassword}><label className="field"><span>New password</span><input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><button className="button button-dark" type="submit" disabled={authWorking}>{authWorking ? "Updating…" : "Update password"}</button></form></section>;
  if (!auth.user) return <section className="admin-gate section-pad"><p className="eyebrow">Victayla store access</p><h1>Admin <em>sign-in.</em></h1><p className="body-copy">Only the authorised Victayla account can manage the store. Public account registration is disabled.</p>
    {loginMode === "login" ? <form className="admin-auth-form" onSubmit={submitLogin}><label className="field"><span>Email</span><input required type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><label className="field"><span>Password</span><input required type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label><button className="button button-dark" type="submit" disabled={authWorking}><LogIn size={15} /> {authWorking ? "Signing in…" : "Sign in"}</button><button className="text-button" type="button" onClick={() => { setLoginMode("reset"); setResetSent(false); }}>Forgot password?</button></form> : <form className="admin-auth-form" onSubmit={submitReset}><p className="body-copy">{resetSent ? "If the authorised address is registered, a secure reset link has been sent." : "Enter the authorised administrator email and we’ll send a secure reset link."}</p><label className="field"><span>Email</span><input required type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label><button className="button button-dark" type="submit" disabled={authWorking}>{authWorking ? "Sending…" : "Send reset link"}</button><button className="text-button" type="button" onClick={() => setLoginMode("login")}>Back to sign in</button></form>}
  </section>;
  if (auth.user.role !== "admin" || catalog.error?.data?.code === "FORBIDDEN") return <section className="admin-gate section-pad"><p className="eyebrow">Restricted area</p><h1>Admin <em>access only.</em></h1><p className="body-copy">This account isn’t authorised to manage Victayla products. Sign in with the administrator account configured for this store.</p><button className="text-button" type="button" onClick={() => void auth.logout()}>Sign out</button></section>;
  if (catalog.isLoading) return <div className="page-loading">Preparing your store desk…</div>;
  if (catalog.isError) return <section className="admin-gate section-pad"><p className="eyebrow">Store desk</p><h1>Something <em>needs a moment.</em></h1><p className="body-copy">The catalogue could not be loaded.</p><button className="button button-dark" type="button" onClick={() => void catalog.refetch()}>Try again</button></section>;

  return (
    <section className="admin-page section-pad">
      <div className="admin-title-row"><div><p className="eyebrow">Private store desk</p><h1>Good day, <em>{auth.user.name?.split(" ")[0] || "admin"}.</em></h1><p className="body-copy">Your catalogue, considered and ready for its next edit.</p></div><span className="admin-secure"><span /> Authorised administrator</span></div>
      <div className="admin-toolbar"><div className="admin-tabs"><button className={tab === "products" ? "is-active" : ""} type="button" onClick={() => setTab("products")}>Products <span>{products.length}</span></button><button className={tab === "collections" ? "is-active" : ""} type="button" onClick={() => setTab("collections")}>Collections <span>{collections.length}</span></button></div>
        {!productEditorOpen && !collectionEditorOpen && <button className="button button-dark admin-add-button" type="button" onClick={() => tab === "products" ? beginNewProduct() : (setCollectionForm(blankCollection()), setCollectionEditorOpen(true))}><Plus size={15} /> {tab === "products" ? "Add product" : "Add collection"}</button>}
      </div>

      {tab === "products" && !productEditorOpen && <div className="admin-product-list">
        {sortedProducts.length === 0 ? <div className="admin-empty"><h2>A fresh page.</h2><p>Add your first piece to begin building the catalogue.</p><button className="button button-dark" type="button" onClick={beginNewProduct}>Add your first product <Plus size={14} /></button></div> : sortedProducts.map((product) => {
          const collection = collections.find((item) => item.id === product.collectionId);
          const firstImage = product.images[0]?.imageUrl;
          return <article className="admin-product-row" key={product.id}>
            <div className="admin-row-image">{firstImage ? <img src={firstImage} alt="" /> : <span>V</span>}</div>
            <div className="admin-row-info"><span className="eyebrow">{collection?.title ?? "Collection"}</span><h2>{product.name}</h2><p>{product.price === null ? "Price not set" : formatNaira(product.price)}{product.discountPercent > 0 ? ` · ${formatDiscount(product.discountPercent)}% off` : ""} · {product.sizes.length} size options · {product.images.length} images</p></div>
            <span className={`status-pill ${product.isPublished ? "is-live" : "is-draft"}`}>{product.isPublished ? "Visible" : "Draft"}</span>
            <button className="admin-row-edit" type="button" onClick={() => editProduct(product)}>Edit <ArrowUpRight size={13} /></button>
            <button className="text-button admin-visibility" type="button" onClick={async () => { try { await setVisibility.mutateAsync({ id: product.id, isPublished: !product.isPublished }); await utils.admin.catalog.invalidate(); toast.success(product.isPublished ? "Product hidden." : "Product made visible."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update visibility."); } }}>{product.isPublished ? "Hide" : "Make visible"}</button>
          </article>;
        })}
      </div>}

      {tab === "products" && productEditorOpen && <form className="admin-editor" onSubmit={submitProduct}>
        <div className="editor-heading"><div><p className="eyebrow">{productForm.id ? "Update your catalogue" : "A new piece"}</p><h2>{productForm.id ? "Edit product" : "Add product"}</h2></div><button className="icon-only" type="button" aria-label="Close product editor" onClick={() => setProductEditorOpen(false)}><X size={19} /></button></div>
        <div className="editor-grid">
          <label className="field"><span>Product name</span><input required maxLength={220} value={productForm.name} onChange={(event) => setProductForm((form) => ({ ...form, name: event.target.value }))} placeholder="e.g. The Sunday Denim" /></label>
          <label className="field"><span>Collection</span><select required value={productForm.collectionId} onChange={(event) => setProductForm((form) => ({ ...form, collectionId: event.target.value }))}><option value="">Choose a collection</option>{collections.filter((item) => item.isActive).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          <label className="field"><span>Regular price · NGN</span><input inputMode="decimal" type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((form) => ({ ...form, price: event.target.value }))} placeholder="Leave blank until set" /></label>
          <label className="field"><span>Discount · percent</span><div className="input-suffix"><input type="number" min="0" max="100" step="0.5" value={productForm.discountPercent} onChange={(event) => setProductForm((form) => ({ ...form, discountPercent: event.target.value }))} /><span>%</span></div></label>
          <label className="field field-wide"><span>Product details</span><textarea rows={4} maxLength={10000} value={productForm.description} onChange={(event) => setProductForm((form) => ({ ...form, description: event.target.value }))} placeholder="Fabric, fit, care, and anything else customers should know." /></label>
          <label className="field field-wide"><span>Sizes and stock</span><textarea rows={5} value={productForm.sizesText} onChange={(event) => setProductForm((form) => ({ ...form, sizesText: event.target.value }))} placeholder={'One size per line: size, available quantity\nXS, 2\nS, 4\nM, 3'} /><small>Use one line per size in “Size, quantity” format. Set quantity to 0 to mark a size sold out.</small></label>
          <div className="field field-wide"><span>Product images</span><label className="upload-drop"><ImagePlus size={18} /><span>{uploadingImages ? "Uploading images…" : "Add as many images as you need"}</span><small>JPEG, PNG, WebP, or AVIF · up to 8 MB each · no fixed image slots</small><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploadingImages} onChange={addProductImages} /></label>
            {productForm.images.length > 0 && <div className="admin-image-list">{productForm.images.map((image, index) => <div className="admin-image-thumb" key={`${image.url ?? image.fileName}-${index}`}><img src={imageSrc(image)} alt={image.altText || `Product image ${index + 1}`} /><button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => setProductForm((form) => ({ ...form, images: form.images.filter((_, imageIndex) => imageIndex !== index) }))}><X size={13} /></button></div>)}</div>}
          </div>
          <label className="publish-toggle"><input type="checkbox" checked={productForm.isPublished} onChange={(event) => setProductForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span><strong>Visible in the storefront</strong><small>Turn off to keep this piece as a private draft.</small></span></label>
        </div>
        <div className="editor-actions"><button className="button button-dark" type="submit" disabled={productSaving || uploadingImages}><Save size={14} /> {productSaving ? "Saving…" : uploadingImages ? "Uploading…" : "Save product"}</button><button className="text-button" type="button" onClick={() => setProductEditorOpen(false)}>Cancel</button></div>
      </form>}

      {tab === "collections" && !collectionEditorOpen && <div className="admin-collection-list">{collections.map((collection) => <article className="admin-collection-row" key={collection.id}><div className="admin-collection-cover">{collection.imageUrl ? <img src={collection.imageUrl} alt="" /> : <span>V</span>}</div><div className="admin-row-info"><span className="eyebrow">/{collection.slug}</span><h2>{collection.title}</h2><p>{collection.tagline}</p></div><button className="admin-row-edit" type="button" onClick={() => editCollection(collection)}>Edit <ArrowUpRight size={13} /></button></article>)}</div>}

      {tab === "collections" && collectionEditorOpen && <form className="admin-editor" onSubmit={submitCollection}>
        <div className="editor-heading"><div><p className="eyebrow">Homepage and edit pages</p><h2>{collectionForm.id ? "Edit collection" : "Add collection"}</h2></div><button className="icon-only" type="button" aria-label="Close collection editor" onClick={() => setCollectionEditorOpen(false)}><X size={19} /></button></div>
        <div className="editor-grid">
          <label className="field"><span>Collection name</span><input required maxLength={180} value={collectionForm.title} onChange={(event) => setCollectionForm((form) => ({ ...form, title: event.target.value }))} placeholder="e.g. The New Edit" /></label>
          <label className="field"><span>Short line</span><input maxLength={240} value={collectionForm.tagline} onChange={(event) => setCollectionForm((form) => ({ ...form, tagline: event.target.value }))} placeholder="A few words beneath the collection name" /></label>
          <label className="field field-wide"><span>Collection description</span><textarea rows={3} maxLength={10000} value={collectionForm.description} onChange={(event) => setCollectionForm((form) => ({ ...form, description: event.target.value }))} placeholder="An introduction to this edit." /></label>
          <div className="field field-wide">
            <span>Cover image</span>
            <label className="upload-drop">
              <ImagePlus size={18} />
              <span>Choose a cover image</span>
              <small>JPEG, PNG, WebP, or AVIF · up to 8 MB</small>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={chooseCollectionImage} />
            </label>
            {collectionForm.image && (
              <div className="admin-image-list">
                <div className="admin-image-thumb collection-preview">
                  <img src={imageSrc(collectionForm.image)} alt="Collection cover preview" />
                  <button type="button" aria-label="Remove new cover image" onClick={() => setCollectionForm((form) => ({ ...form, image: undefined }))}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="editor-actions"><button className="button button-dark" type="submit" disabled={collectionSaving}><Save size={14} /> {collectionSaving ? "Saving…" : "Save collection"}</button><button className="text-button" type="button" onClick={() => setCollectionEditorOpen(false)}>Cancel</button></div>
      </form>}
      <p className="admin-storage-note">Product and collection images are kept in Supabase Storage. Public pages can display saved images; only the authorised administrator can request a short-lived upload token.</p>
    </section>
  );
}
