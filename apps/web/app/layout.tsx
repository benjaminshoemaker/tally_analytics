import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Tally Analytics",
  description: "Analytics for Next.js, installed in one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
