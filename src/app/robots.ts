import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/cart", "/wishlist"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
