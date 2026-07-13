import type { MetadataRoute } from "next";

const productionUrl = "https://hexofearth.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${productionUrl}/sitemap.xml`,
    host: productionUrl
  };
}
