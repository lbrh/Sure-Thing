import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Sure Thing",
  description: "Bet on what you know. The board shows you what you don't.",
};
export const viewport: Viewport = { themeColor: "#000080", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
