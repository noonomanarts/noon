import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Noon",
    short_name: "Noon",
    description:
      "Noon — Learn, Create & Celebrate with noon",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f77d6b",
    lang: "en",
    dir: "auto",
    categories: ["food", "lifestyle", "education", "shopping"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-256x256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/og-image.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "Noon",
      },
    ],
    shortcuts: [
      {
        name: "Classes",
        short_name: "Classes",
        description: "Browse upcoming classes",
        url: "/en/classes",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Group Booking & Events",
        short_name: "Events",
        description: "Book a private event",
        url: "/en/group-booking-events",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Noon Recommends",
        short_name: "Shop",
        description: "Products we love",
        url: "/en/noon-recommends",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "My Account",
        short_name: "Account",
        description: "Your bookings and profile",
        url: "/en/account",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
