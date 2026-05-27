"use client";

import { usePathname } from "next/navigation";
import BottomTab from "@/components/BottomTab";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === "/map" || pathname.startsWith("/map/");

  // Map page: full screen
  if (isMapPage) {
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%" }}>
          <div style={{ flex: 1, position: "relative" }}>
            {children}
          </div>
        </div>
        <BottomTab />
      </>
    );
  }

  // Other pages: scrollable, centered
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", maxWidth: 600, margin: "0 auto", background: "#FFFFFF" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
      <BottomTab />
    </>
  );
}
