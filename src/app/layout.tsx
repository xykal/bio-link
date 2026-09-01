import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col">
        <FontLoader href={fontsHref} />
        {children}
      </body>
    </html>
  );
}
