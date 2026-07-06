import type { MetadataRoute } from "next";

const productionUrl = "https://pixel-weld-tau.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${productionUrl}/sitemap.xml`,
    host: productionUrl
  };
}
