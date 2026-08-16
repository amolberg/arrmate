import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/server/auth/session";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Arrmate",
    template: "%s · Arrmate",
  },
  description: "The friendly control plane for your self-hosted media stack.",
  applicationName: "Arrmate",
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
