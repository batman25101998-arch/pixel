import type { MetadataRoute } from "next";

const productionUrl = "https://hexofearth.com";

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
