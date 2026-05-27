"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface OnboardingProps {
  onDone: () => void;
}

const slides = [
  {
    title: "근처의 드라이브 코스를\n찾아보세요",
    subtitle: "내 주변의 멋진 드라이브 코스를 한눈에",
    illustration: "discover",
  },
  {
    title: "나만의 코스를\n만들고 공유해보세요",
    subtitle: "경유지를 찍어 나만의 루트를 완성하세요",
    illustration: "create",
  },
  {
    title: "사진과 음악으로\n추억을 남기세요",
    subtitle: "드라이브의 순간을 더 특별하게",
    illustration: "enrich",
  },
  {
    title: "3D 애니메이션으로\n코스를 미리 달려보세요",
    subtitle: "실제 드라이브 전에 미리보기",
    illustration: "preview",
  },
];

function DiscoverIllustration() {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Map card */}
      <rect x="30" y="40" width="180" height="160" rx="20" fill="#fff"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.04)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }} />
      {/* Roads */}
      <path d="M30 120 Q80 100 120 120 T210 110" stroke="#f2f2f2" strokeWidth="8" strokeLinecap="round" />
      <path d="M80 40 Q90 80 80 120 T90 200" stroke="#f2f2f2" strokeWidth="6" strokeLinecap="round" />
      {/* Location pins */}
      <g transform="translate(70, 75)">
        <circle cx="0" cy="0" r="14" fill="var(--color-brand)" opacity="0.12" />
        <circle cx="0" cy="0" r="8" fill="var(--color-brand)" />
        <circle cx="0" cy="0" r="3" fill="#fff" />
      </g>
      <g transform="translate(150, 95)">
        <circle cx="0" cy="0" r="14" fill="var(--color-brand)" opacity="0.12" />
        <circle cx="0" cy="0" r="8" fill="var(--color-brand)" />
        <circle cx="0" cy="0" r="3" fill="#fff" />
      </g>
      <g transform="translate(120, 155)">
        <circle cx="0" cy="0" r="14" fill="var(--color-brand)" opacity="0.12" />
        <circle cx="0" cy="0" r="8" fill="var(--color-brand)" />
        <circle cx="0" cy="0" r="3" fill="#fff" />
      </g>
      {/* Route dashes */}
      <path d="M70 75 Q110 65 150 95 Q140 125 120 155" stroke="var(--color-brand)" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" fill="none" />
      {/* Compass */}
      <g transform="translate(185, 65)">
        <circle cx="0" cy="0" r="15" fill="#fff" stroke="#e0e0e0" strokeWidth="1.5" />
        <path d="M0 -9 L3 3 L0 0 L-3 3 Z" fill="var(--color-brand)" />
        <path d="M0 9 L3 -3 L0 0 L-3 -3 Z" fill="#c1c1c1" />
      </g>
    </svg>
  );
}

function CreateIllustration() {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone frame */}
      <rect x="55" y="20" width="130" height="200" rx="20" fill="#fff"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.04)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }} />
      <rect x="63" y="36" width="114" height="168" rx="8" fill="#fafafa" />
      {/* Map road */}
      <path d="M63 100 Q90 80 120 95 T177 90" stroke="#f2f2f2" strokeWidth="4" strokeLinecap="round" />
      {/* Waypoint markers */}
      <g transform="translate(85, 78)">
        <circle cx="0" cy="0" r="11" fill="#222222" />
        <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">1</text>
      </g>
      <g transform="translate(125, 98)">
        <circle cx="0" cy="0" r="11" fill="#222222" />
        <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">2</text>
      </g>
      <g transform="translate(158, 82)">
        <circle cx="0" cy="0" r="11" fill="#222222" />
        <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">3</text>
      </g>
      {/* Route line */}
      <path d="M85 78 Q105 90 125 98 Q142 90 158 82" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Share button */}
      <g transform="translate(150, 155)">
        <circle cx="0" cy="0" r="16" fill="var(--color-brand)" />
        <path d="M-4 1 L0 -4 L4 1 M0 -3 L0 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Plus button */}
      <g transform="translate(90, 155)">
        <circle cx="0" cy="0" r="16" fill="#f2f2f2" />
        <path d="M-5 0 H5 M0 -5 V5" stroke="#222222" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function EnrichIllustration() {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Polaroid photo */}
      <g transform="translate(35, 35) rotate(-6)">
        <rect width="105" height="125" rx="4" fill="#fff"
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.04)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }} />
        <rect x="8" y="8" width="89" height="84" rx="2" fill="#fafafa" />
        {/* Landscape */}
        <path d="M8 68 L30 45 L50 62 L68 48 L97 72 L97 92 L8 92 Z" fill="var(--color-brand)" opacity="0.15" />
        <path d="M8 78 L40 55 L70 72 L97 58 L97 92 L8 92 Z" fill="var(--color-brand)" opacity="0.25" />
        <circle cx="74" cy="30" r="10" fill="var(--color-brand)" opacity="0.2" />
      </g>
      {/* Music card */}
      <g transform="translate(120, 55) rotate(4)">
        <rect width="95" height="115" rx="14" fill="#fff"
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.04)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }} />
        {/* Vinyl record */}
        <g transform="translate(48, 48)">
          <circle cx="0" cy="0" r="28" fill="#222222" opacity="0.06" />
          <circle cx="0" cy="0" r="22" stroke="#222222" strokeWidth="1.5" fill="none" opacity="0.15" />
          <circle cx="0" cy="0" r="15" stroke="#222222" strokeWidth="1" fill="none" opacity="0.1" />
          <circle cx="0" cy="0" r="6" fill="var(--color-brand)" />
          <circle cx="0" cy="0" r="2" fill="#fff" />
        </g>
        {/* Music notes */}
        <g transform="translate(62, 90)">
          <path d="M0 0 V-14 L12 -18 V-4" stroke="#222222" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="0" cy="0" r="4" fill="#222222" />
          <circle cx="12" cy="-4" r="4" fill="#222222" />
        </g>
      </g>
      {/* Heart accents */}
      <g transform="translate(28, 178)">
        <path d="M0 4 C0 -2 -8 -4 -8 2 C-8 6 0 12 0 12 C0 12 8 6 8 2 C8 -4 0 -2 0 4Z" fill="var(--color-brand)" opacity="0.25" />
      </g>
      <g transform="translate(205, 42)">
        <path d="M0 3 C0 -1.5 -6 -3 -6 1.5 C-6 4.5 0 9 0 9 C0 9 6 4.5 6 1.5 C6 -3 0 -1.5 0 3Z" fill="var(--color-brand)" opacity="0.2" />
      </g>
    </svg>
  );
}

function PreviewIllustration() {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Perspective road */}
      <path d="M70 220 L110 60 L130 60 L170 220 Z" fill="#222222" opacity="0.04" />
      <path d="M90 220 L115 70 L125 70 L150 220" stroke="#222222" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.15" />
      {/* Mountains */}
      <path d="M20 140 L70 50 L100 100 L130 40 L180 120 L220 80 L240 140 Z" fill="#222222" opacity="0.03" />
      <path d="M0 160 L50 90 L90 130 L130 70 L170 110 L210 60 L240 100 L240 160 Z" fill="#222222" opacity="0.06" />
      {/* Car marker */}
      <g transform="translate(120, 110)">
        <circle cx="0" cy="0" r="22" fill="#fff"
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.04)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }} />
        <circle cx="0" cy="0" r="20" fill="#fff" stroke="var(--color-brand)" strokeWidth="2.5" />
        <path d="M0 -10 L7 6 L0 2 L-7 6 Z" fill="var(--color-brand)" />
      </g>
      {/* Speed lines */}
      <path d="M85 130 L60 145" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <path d="M80 120 L55 130" stroke="#6a6a6a" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <path d="M82 140 L62 155" stroke="#6a6a6a" strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
      {/* Play button */}
      <g transform="translate(120, 188)">
        <circle cx="0" cy="0" r="22" fill="#222222" />
        <path d="M-4 -7 L7 0 L-4 7 Z" fill="#fff" />
      </g>
      {/* 3D badge */}
      <g transform="translate(178, 55)">
        <rect x="-18" y="-11" width="36" height="22" rx="11" fill="var(--color-brand)" />
        <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">3D</text>
      </g>
    </svg>
  );
}

const illustrationMap: Record<string, () => JSX.Element> = {
  discover: DiscoverIllustration,
  create: CreateIllustration,
  enrich: EnrichIllustration,
  preview: PreviewIllustration,
};

export default function Onboarding({ onDone }: OnboardingProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(slides.length - 1, idx)));
    setDragOffset(0);
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem("routebook_onboarding_done", "1");
    onDone();
  }, [onDone]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    const threshold = 60;
    if (touchDeltaX.current < -threshold && current < slides.length - 1) {
      goTo(current + 1);
    } else if (touchDeltaX.current > threshold && current > 0) {
      goTo(current - 1);
    } else {
      setDragOffset(0);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && current < slides.length - 1) goTo(current + 1);
      if (e.key === "ArrowLeft" && current > 0) goTo(current - 1);
      if (e.key === "Enter" && current === slides.length - 1) finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, goTo, finish]);

  const slide = slides[current];
  const Illust = illustrationMap[slide.illustration];
  const isLast = current === slides.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body)",
        touchAction: "pan-y",
        overflow: "hidden",
      }}
    >
      {/* Skip */}
      {!isLast && (
        <button
          onClick={finish}
          style={{
            position: "absolute",
            top: "max(16px, env(safe-area-inset-top, 16px))",
            right: 20,
            zIndex: 10,
            background: "none",
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            color: "#6a6a6a",
            cursor: "pointer",
            padding: "8px 4px",
            fontFamily: "var(--font-body)",
          }}
        >
          건너뛰기
        </button>
      )}

      {/* Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          gap: 40,
        }}
      >
        {/* Illustration */}
        <div
          style={{
            width: 220,
            height: 220,
            transform: `translateX(${dragOffset * 0.3}px)`,
            transition: dragOffset === 0 ? "transform 0.35s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
        >
          <Illust />
        </div>

        {/* Text */}
        <div
          style={{
            textAlign: "center",
            transform: `translateX(${dragOffset * 0.15}px)`,
            transition: dragOffset === 0 ? "transform 0.35s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
        >
          <h2
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#222222",
              lineHeight: 1.35,
              margin: 0,
              whiteSpace: "pre-line",
              letterSpacing: "-0.44px",
            }}
          >
            {slide.title}
          </h2>
          <p
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: "#6a6a6a",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div
        style={{
          padding: "0 32px",
          paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Dots */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === current ? "var(--color-brand)" : "rgba(0,0,0,0.1)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={isLast ? finish : () => goTo(current + 1)}
          style={{
            width: "100%",
            maxWidth: 340,
            padding: "16px 0",
            borderRadius: 8,
            border: "none",
            background: "#222222",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            letterSpacing: "-0.18px",
          }}
        >
          {isLast ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}
