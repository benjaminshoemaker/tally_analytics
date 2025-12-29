import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, Lora } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://usetally.xyz"),
  title: {
    default: "Tally Analytics",
    template: "%s | Tally Analytics",
  },
  description: "Add privacy-friendly analytics to your Next.js app in one click. No consent banner needed, no complex setup.",
  openGraph: {
    title: "Tally — Analytics for Next.js",
    description: "Add privacy-friendly analytics to your Next.js app in one click. No consent banner needed, no complex setup.",
    url: "https://usetally.xyz",
    siteName: "Tally Analytics",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tally Analytics" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tally — Analytics for Next.js",
    description: "Add privacy-friendly analytics to your Next.js app in one click. No consent banner needed, no complex setup.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable} font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
