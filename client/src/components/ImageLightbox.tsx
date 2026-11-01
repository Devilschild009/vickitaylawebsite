import { useEffect } from "react";
import { X } from "lucide-react";

export default function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Enlarged product image" onClick={onClose}>
      <button className="lightbox-close" type="button" aria-label="Close enlarged image" onClick={onClose}><X size={22} /></button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
      <p>{alt}</p>
    </div>
  );
}
