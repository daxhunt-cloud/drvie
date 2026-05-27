"use client";

interface FilmOverlayProps {
  photos: string[];
  ratio: number;
}

export default function FilmOverlay({ photos, ratio }: FilmOverlayProps) {
  const N = photos.length;
  if (N === 0) return null;

  const segmentDuration = 1 / N;
  const currentIndex = Math.min(Math.floor(ratio / segmentDuration), N - 1);
  const nextIndex = Math.min(currentIndex + 1, N - 1);
  const segmentProgress = (ratio - currentIndex * segmentDuration) / segmentDuration;

  const fadeZone = 0.15;
  let nextOpacity = 0;
  if (currentIndex < N - 1 && segmentProgress > 1 - fadeZone) {
    nextOpacity = (segmentProgress - (1 - fadeZone)) / fadeZone;
  }

  // Rounded rectangle — outer and inner with uniform inset
  const r = 8; // outer corner radius (in 0-100 space)
  const outerPath = `M ${r} 0 L ${100-r} 0 Q 100 0, 100 ${r} L 100 100 L 0 100 L 0 ${r} Q 0 0, ${r} 0 Z`;
  const p = 5; // padding
  const ri = 5; // inner corner radius
  const innerPath = `M ${p+ri} ${p} L ${100-p-ri} ${p} Q ${100-p} ${p}, ${100-p} ${p+ri} L ${100-p} ${100-p} L ${p} ${100-p} L ${p} ${p+ri} Q ${p} ${p}, ${p+ri} ${p} Z`;

  return (
    <>
    {/* Dashboard surface */}
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "20%",
      zIndex: 9,
      background: "linear-gradient(180deg, #3a3a3e 0%, #2a2a2e 30%, #1e1e22 100%)",
      pointerEvents: "none",
    }}>
      {/* Dashboard top edge highlight */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.25) 70%, transparent 95%)",
      }} />
      {/* Dashboard wide sheen */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)",
      }} />
      {/* Texture grain */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "80px 80px",
      }} />
    </div>

    {/* Nav bezel */}
    <div style={{
      position: "absolute",
      bottom: 0,
      left: "5%",
      right: "5%",
      height: "32%",
      zIndex: 10,
      pointerEvents: "none",
    }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <clipPath id="nav-outer" clipPathUnits="objectBoundingBox">
            <path transform="scale(0.01)" d={outerPath} />
          </clipPath>
          <clipPath id="nav-inner" clipPathUnits="objectBoundingBox">
            <path transform="scale(0.01)" d={innerPath} />
          </clipPath>
        </defs>
      </svg>

      {/* Bezel body — piano black glossy */}
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "url(#nav-outer)",
        background: "linear-gradient(175deg, #65656e 0%, #3d3d44 10%, #1e1e22 30%, #111114 50%, #1e1e22 70%, #3d3d44 90%, #55555e 100%)",
        position: "absolute",
        inset: 0,
      }} />
      {/* Primary specular — strong top-left reflection */}
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "url(#nav-outer)",
        background: "linear-gradient(150deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 20%, transparent 40%)",
        position: "absolute",
        inset: 0,
      }} />
      {/* Secondary specular — bottom edge bright catch */}
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "url(#nav-outer)",
        background: "linear-gradient(0deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 20%, transparent 35%)",
        position: "absolute",
        inset: 0,
      }} />
      {/* Horizontal sheen band — like light reflecting across curved surface */}
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "url(#nav-outer)",
        background: "linear-gradient(180deg, transparent 20%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.06) 45%, transparent 60%)",
        position: "absolute",
        inset: 0,
      }} />

      {/* Inner bezel rim */}
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "url(#nav-inner)",
        background: "#0c0c0e",
        position: "absolute",
        inset: 0,
      }} />

      {/* Edge highlights */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <path d={outerPath} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <path d={innerPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Screen area */}
      <div style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        clipPath: "url(#nav-inner)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        boxSizing: "border-box",
      }}>
        <div style={{
          width: "100%",
          height: "100%",
          borderRadius: 6,
          overflow: "hidden",
          position: "relative",
          background: "#000",
        }}>
          <img
            src={photos[currentIndex]}
            alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
            }}
          />
          {nextOpacity > 0 && currentIndex !== nextIndex && (
            <img
              src={photos[nextIndex]}
              alt=""
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover",
                opacity: nextOpacity,
              }}
            />
          )}
          {/* Screen glare */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(255,255,255,0.08) 0%, transparent 30%)",
            pointerEvents: "none",
          }} />
        </div>
      </div>
    </div>
    </>
  );
}
