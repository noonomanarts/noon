import type { MetadataRoute } from "next";

import { getPublicSiteBaseUrl } from "@/lib/publicSiteUrl";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or transactional areas: nothing here is useful in search.
        disallow: [
          "/api/",
          "/*/admin",
          "/*/worker",
          "/*/photographer",
          "/*/account",
          "/*/cart",
          "/*/checkout",
          "/*/login",
          "/*/register",
          "/*/wallet",
          "/*/search",
          "/login",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
