import "./globals.css";
import MainWrapper from "@/components/layout/main-wrapper";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Nexo Invoicer",
  description: "Sistema de facturação profissional",

  // ✅ PWA
  manifest: "/manifest.webmanifest",

  // ✅ Ícones (os arquivos devem existir em /public/icons)
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="antialiased">
        <MainWrapper>{children}</MainWrapper>
      </body>
    </html>
  );
}
