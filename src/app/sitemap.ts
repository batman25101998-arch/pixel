import type { MetadataRoute } from "next";

const productionUrl = "https://pixel-weld-tau.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: productionUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    }
  ];
}
