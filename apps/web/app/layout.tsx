import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Lora } from "next/font/google";

import "./globals.css";

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
  description: "Add analytics from your AI coding agent, then understand usage in the Tally dashboard.",
  openGraph: {
    title: "Tally — Analytics from your AI coding agent",
    description: "Add analytics from your AI coding agent, then understand usage in the Tally dashboard.",
    url: "https://usetally.xyz",
    siteName: "Tally Analytics",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tally Analytics" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tally — Analytics from your AI coding agent",
    description: "Add analytics from your AI coding agent, then understand usage in the Tally dashboard.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${lora.variable} font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
