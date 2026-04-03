import type { Metadata } from "next";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Map App",
  description: "Mapbox GL JS with Next.js and Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full w-full">
      <body className="h-full w-full m-0 overflow-hidden relative">{children}</body>
    </html>
  );
}
