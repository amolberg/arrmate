import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Arrmate proxies TMDB artwork through `/api/artwork`, but Sonarr and
    // Radarr return absolute URLs for series and movie posters. Trust the
    // upstream hosts Sonarr/Radarr pull from.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "artworks.thetvdb.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "image.posterdb.com",
      },
      {
        protocol: "https",
        hostname: "assets.fanart.tv",
      },
    ],
    localPatterns: [{ pathname: "/api/artwork" }],
  },
};

export default nextConfig;
