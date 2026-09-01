import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Haekal · Bio Link",
  description: "Semua link Haekal dalam satu halaman — bio.haekal.web.id",
  metadataBase: new URL("https://bio.haekal.web.id"),
  openGraph: {
    title: "Haekal · Bio Link",
    description: "Semua link Haekal dalam satu halaman.",
    url: "https://bio.haekal.web.id",
    siteName: "Haekal Bio Link",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Haekal · Bio Link",
    description: "Semua link Haekal dalam satu halaman.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
