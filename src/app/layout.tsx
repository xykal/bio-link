import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { readStore } from "@/lib/data";
import { googleFontsHref, usedFontKeys } from "@/lib/fonts";
import FontLoader from "@/components/FontLoader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://bio.haekal.web.id"),
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let fontsHref = "";
  try {
    const store = await readStore();
    fontsHref = googleFontsHref(usedFontKeys(store.fonts));
  } catch {
    fontsHref = "";
  }

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect: mempercepat muat gambar (Cloudinary) & font (Google) */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <FontLoader href={fontsHref} />
        {children}
      </body>
    </html>
  );
}
