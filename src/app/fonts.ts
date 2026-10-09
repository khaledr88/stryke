import localFont from "next/font/local";

/** Fonts are self-hosted (from @fontsource) so builds never depend on a font CDN. */
export const barlowCondensed = localFont({
  variable: "--font-barlow-condensed",
  display: "swap",
  src: [
    { path: "../fonts/barlow-condensed-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/barlow-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/barlow-condensed-latin-700-italic.woff2", weight: "700", style: "italic" },
    { path: "../fonts/barlow-condensed-latin-800-italic.woff2", weight: "800", style: "italic" },
    { path: "../fonts/barlow-condensed-latin-900-italic.woff2", weight: "900", style: "italic" },
  ],
});

export const barlow = localFont({
  variable: "--font-barlow",
  display: "swap",
  src: [
    { path: "../fonts/barlow-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/barlow-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
