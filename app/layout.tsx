import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X_Farm | Virtual growing dashboard",
  description: "Monitor virtual plants and simulated growing conditions with X_Farm.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
