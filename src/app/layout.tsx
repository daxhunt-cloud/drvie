import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://routebook-app.vercel.app"),
  title: "루트북 - Routebook",
  description: "나만의 드라이브 코스를 만들고 공유하세요",
  verification: {
    google: "CCdU0rJo9_UjYTCsHx1UMmBTPHqt4STaV_aa-Mmzfe0",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "루트북 - Routebook",
    description: "나만의 드라이브 코스를 만들고 공유하세요",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full w-full">
      <head>
        <link rel="stylesheet" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="h-full w-full m-0 relative" style={{ overflow: "auto", background: "#F4F4F4", color: "var(--color-text-primary)", fontFamily: "var(--font-body)" }}>
        <Providers>{children}</Providers>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-V9C13LRQ72" strategy="afterInteractive" />
        <Script id="ga" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-V9C13LRQ72');
        `}</Script>
        <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js" strategy="afterInteractive" />
        <Script id="sw" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.__pwaPrompt = e;
          });
        `}</Script>
      </body>
    </html>
  );
}
