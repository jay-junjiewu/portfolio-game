import type { ImgHTMLAttributes } from "react";

type PictureProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt?: string;
};

const RASTER = /\.(png|jpe?g)$/i;

/**
 * Drop-in <img> replacement that serves pre-generated AVIF/WebP siblings (see
 * scripts/optimize-images.mjs) with the original raster as the universal
 * fallback. The <picture> wrapper is layout-neutral (`display: contents` in
 * index.css), so existing CSS that targets the inner <img> keeps working.
 * A missing .avif/.webp simply falls through to the next <source> / <img>.
 */
const Picture = ({ src, alt = "", loading = "lazy", decoding = "async", ...rest }: PictureProps) => {
  // Lazy by default: write-up images sit below the summary text, and loading
  // them eagerly competes with the text and styles for bandwidth.
  if (!RASTER.test(src)) {
    return <img src={src} alt={alt} loading={loading} decoding={decoding} {...rest} />;
  }
  const base = src.replace(RASTER, "");
  return (
    <picture>
      <source srcSet={`${base}.avif`} type="image/avif" />
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img src={src} alt={alt} loading={loading} decoding={decoding} {...rest} />
    </picture>
  );
};

export default Picture;
