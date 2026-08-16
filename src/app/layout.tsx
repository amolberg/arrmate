import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/server/auth/session";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Arrmate",
    template: "%s · Arrmate",
  },
  description: "The friendly control plane for your self-hosted media stack.",
  applicationName: "Arrmate",
  openGraph: {
    title: "Arrmate",
    description: "Your media stack, finally in one place.",
    images: [{ url: "/assets/arrmate-social.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1110",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const viewer = await getViewer();
  return (
    <html lang="en">
      <body>
        <AppShell viewer={viewer}>{children}</AppShell>
      </body>
    </html>
  );
}
