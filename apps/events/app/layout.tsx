import type { ReactNode } from "react";

export const metadata = {
  title: "Fast PR Analytics Events",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

