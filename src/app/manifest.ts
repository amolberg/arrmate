import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arrmate",
    short_name: "Arrmate",
    description: "The friendly control plane for your self-hosted media stack.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1110",
    theme_color: "#0d1110",
    icons: [
      {
        src: "/assets/arrmate-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/arrmate-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/arrmate-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
