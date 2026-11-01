import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function StoreShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const onHome = location === "/";

  return (
    <>
      <div className="announcement"><span>Considered fashion · Lagos / Everywhere</span><span className="announcement-separator">✦</span><span>Made for every you</span></div>
      <header className={`site-header ${onHome ? "site-header-overlay" : ""}`}>
        <Link className="wordmark" href="/" aria-label="Victayla home">VICTAYLA</Link>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <Link href="/#collections" onClick={() => setMenuOpen(false)}>The goods</Link>
          <Link href="/#story" onClick={() => setMenuOpen(false)}>Our story</Link>
        </nav>
        <div className="header-actions">
          <Link className="bag-link" href="/bag" aria-label={`Open bag, ${itemCount} items`}>
            <ShoppingBag size={18} strokeWidth={1.5} /><span>Bag</span><span className="bag-count">{itemCount}</span>
          </Link>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-brand"><Link className="wordmark" href="/">VICTAYLA</Link><p>Timeless fashion<br />for every you.</p></div>
        <div className="footer-links"><span className="eyebrow">Explore</span><Link href="/#collections">The goods</Link><Link href="/bag">Your bag</Link><Link href="/admin">Store admin</Link></div>
        <div className="footer-note"><span className="eyebrow">Lagos / Everywhere</span><p>A wardrobe of silhouettes that let you arrive as yourself.</p></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Victayla</span><span>Made with intention <span aria-hidden="true">✦</span></span></div>
      </footer>
    </>
  );
}
