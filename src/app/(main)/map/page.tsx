"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Toast from "@/components/Toast";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const Onboarding = dynamic(() => import("@/components/Onboarding"), { ssr: false });

export default function MapPage() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedTabToast, setShowFeedTabToast] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("routebook_onboarding_done")) {
      setShowOnboarding(true);
    }
  }, []);

  // Feed tab toast — trigger after onboarding, 1-time only
  useEffect(() => {
    if (showOnboarding) return; // Don't show while onboarding is active
    if (!localStorage.getItem("routebook_feed_tab_seen")) {
      const timer = setTimeout(() => {
        localStorage.setItem("routebook_feed_tab_seen", "1");
        setShowFeedTabToast(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showOnboarding]);

  return (
    <>
      <Map />
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {showFeedTabToast && (
        <Toast
          message="코스 피드가 피드 탭으로 이동했어요 🗺️"
          type="success"
          duration={5000}
          actionLabel="피드 탭으로 이동"
          onAction={() => {
            setShowFeedTabToast(false);
            router.push("/feed");
          }}
          onClose={() => setShowFeedTabToast(false)}
        />
      )}
    </>
  );
}
