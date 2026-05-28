"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { lineString, length as turfLength, along } from "@turf/turf";
import FilmOverlay from "./FilmOverlay";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const FIXED_DURATION_SEC = 45;
const TRAVELED_SRC = "traveled";
const TRAVELED_LYR = "traveled-line";
const REMAINING_SRC = "remaining";
const REMAINING_LYR = "remaining-line";
const OVERVIEW_SRC = "overview-route";
const OVERVIEW_LYR = "overview-route-line";

interface MusicData { videoId: string; startSec: number; endSec: number | null; }
interface WaypointData { lng: number; lat: number; name: string; memo?: string; photoUrl?: string; }
interface CoursePlayerProps {
  routeGeojson: { type: string; coordinates: [number, number][] };
  waypoints: WaypointData[];
  music: MusicData | null;
  title: string;
  distanceKm: number;
  tags: string[];
  photos?: string[];
  comments?: { nickname: string; text: string }[];
  authorName?: string;
  authorAvatar?: string;
  durationMin?: number;
  onFullscreenChange?: (fs: boolean) => void;
}

function getBearing(from: [number, number], to: [number, number]): number {
  const dLng = ((to[0] - from[0]) * Math.PI) / 180;
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Polaroid clothesline — manages a row of polaroids pinned to the top
class PolaroidLine {
  private container: HTMLElement;
  private rail: HTMLElement;
  private track: HTMLElement;
  private cards: HTMLElement[] = [];
  private cardWidth = 110;

  constructor(container: HTMLElement) {
    this.container = container;

    // Create rail (the clothesline) — clips overflow
    this.rail = document.createElement("div");
    this.rail.style.cssText = "position:absolute;top:76px;left:12px;right:12px;z-index:29;overflow:hidden;pointer-events:none;min-height:14px;";

    // String line
    const string = document.createElement("div");
    string.style.cssText = "position:absolute;top:6px;left:0;right:0;height:1.5px;background:rgba(255,255,255,0.4);z-index:-1;";
    this.rail.appendChild(string);

    // Track — holds all cards, shifts left when overflowing
    this.track = document.createElement("div");
    this.track.style.cssText = "display:flex;gap:8px;align-items:flex-start;transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);";
    this.rail.appendChild(this.track);

    container.appendChild(this.rail);
  }

  private updateShift() {
    const railWidth = this.rail.offsetWidth;
    const trackWidth = this.track.scrollWidth;
    if (trackWidth > railWidth) {
      this.track.style.transform = `translateX(-${trackWidth - railWidth}px)`;
    } else {
      this.track.style.transform = "translateX(0)";
    }
  }

  add(photoUrl?: string, memo?: string) {
    const rotation = -3 + Math.random() * 6;

    // === Phase 1: Center popup ===
    const backdrop = document.createElement("div");
    backdrop.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:40px;background:rgba(0,0,0,0.3);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:32;opacity:0;transition:opacity 0.4s ease;pointer-events:none;";
    this.container.appendChild(backdrop);

    const popup = document.createElement("div");
    popup.style.cssText = "position:absolute;top:50%;left:50%;z-index:33;pointer-events:none;transform:translate(-50%,-50%) rotate(-3deg) scale(0.7);opacity:0;transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1);";

    const popupInner = document.createElement("div");
    popupInner.style.cssText = "background:#fafaf8;padding:10px 10px 36px;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.35),0 2px 8px rgba(0,0,0,0.2);";

    const photoFrame = document.createElement("div");
    photoFrame.style.cssText = "width:180px;height:180px;border:1.5px solid #e0e0e0;border-radius:2px;overflow:hidden;box-sizing:border-box;";
    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      photoFrame.appendChild(img);
    } else {
      photoFrame.style.background = "#1a1a1a";
    }
    popupInner.appendChild(photoFrame);
    const text = document.createElement("div");
    text.style.cssText = "margin-top:8px;font-size:14px;color:#4a4a4a;text-align:center;font-style:italic;font-family:'Pretendard Variable',sans-serif;white-space:pre-line;line-height:1.4;letter-spacing:-0.3px;min-height:20px;";
    text.textContent = memo || "";
    popupInner.appendChild(text);

    popup.appendChild(popupInner);
    this.container.appendChild(popup);

    // Animate popup in
    requestAnimationFrame(() => {
      backdrop.style.opacity = "1";
      popup.style.opacity = "1";
      popup.style.transform = "translate(-50%,-50%) rotate(1deg) scale(1)";
    });

    // === Phase 2: Fade out popup, then show on rail ===
    setTimeout(() => {
      backdrop.style.opacity = "0";
      popup.style.opacity = "0";
      popup.style.transform = "translate(-50%,-50%) rotate(1deg) scale(0.3)";
      popup.style.transition = "all 0.4s cubic-bezier(0.4, 0, 1, 1)";

      setTimeout(() => {
        popup.remove();
        backdrop.remove();

        // Create rail card
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `flex-shrink:0;width:${this.cardWidth}px;opacity:0;transition:opacity 0.4s ease;`;
        const pin = document.createElement("div");
        pin.style.cssText = "width:8px;height:8px;border-radius:50%;background:#e74c3c;margin:0 auto 2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);position:relative;z-index:2;";
        wrapper.appendChild(pin);
        const card = document.createElement("div");
        card.style.cssText = `background:#fafaf8;padding:5px 5px 20px;border-radius:2px;box-shadow:0 4px 16px rgba(0,0,0,0.3),0 1px 4px rgba(0,0,0,0.15);transform:rotate(${rotation}deg);`;
        const railFrame = document.createElement("div");
        railFrame.style.cssText = `width:${this.cardWidth - 10}px;height:${this.cardWidth - 10}px;border:1px solid #e0e0e0;border-radius:1px;overflow:hidden;box-sizing:border-box;`;
        if (photoUrl) {
          const img = document.createElement("img");
          img.src = photoUrl;
          img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
          railFrame.appendChild(img);
        } else {
          railFrame.style.background = "#1a1a1a";
        }
        card.appendChild(railFrame);
        const railText = document.createElement("div");
        railText.style.cssText = "margin-top:4px;font-size:9px;color:#555;text-align:center;font-style:italic;font-family:'Pretendard Variable',sans-serif;white-space:pre-line;line-height:1.3;overflow:hidden;max-height:26px;min-height:12px;";
        railText.textContent = memo || "";
        card.appendChild(railText);
        wrapper.appendChild(card);
        this.track.appendChild(wrapper);
        this.cards.push(wrapper);

        // Fade in rail card
        requestAnimationFrame(() => {
          wrapper.style.opacity = "1";
          this.updateShift();
        });
      }, 400);
    }, 1500);
  }

  destroy() {
    this.rail.remove();
    this.cards = [];
  }
}

function createCarMarkerEl(night: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:40px;height:40px;";
  const bg = night ? "#1a1018" : "#ffffff";
  const stroke = night ? "#f5a060" : "#428bff"; // CSS var unsafe in innerHTML-injected SVG attribute
  const arrow = night ? "#f59e42" : "#428bff"; // same rule
  el.innerHTML = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" fill="${bg}" stroke="${stroke}" stroke-width="2.5"/>
    <path d="M20 10 L27 26 L20 22 L13 26 Z" fill="${arrow}"/>
  </svg>`;
  return el;
}

function fadeVolume(player: any, from: number, to: number, durationMs: number, onDone?: () => void) {
  const steps = 10;
  const stepMs = durationMs / steps;
  const delta = (to - from) / steps;
  let current = from;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    current += delta;
    try { player.setVolume(Math.round(Math.max(0, Math.min(100, current)))); } catch {}
    if (step >= steps) {
      clearInterval(interval);
      try { player.setVolume(Math.round(to)); } catch {}
      onDone?.();
    }
  }, stepMs);
  return interval;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

declare global { interface Window { YT: any; onYouTubeIframeAPIReady: (() => void) | undefined; } }

function CommentSlider({ comments, paused, isNight }: { comments: { nickname: string; text: string }[]; paused: boolean; isNight: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(20);
  const GAP = 60; // 댓글 간 간격 (px)

  // 댓글을 3번 반복해서 끊김 없이 루프
  const repeated = [...comments, ...comments, ...comments];

  // 트랙 전체 너비 측정 → 애니메이션 속도 계산
  useEffect(() => {
    if (!trackRef.current) return;
    const fullWidth = trackRef.current.scrollWidth;
    const oneSetWidth = fullWidth / 3;
    const viewportWidth = window.innerWidth;
    // 초당 40px 속도, 100vw 시작 오프셋 포함
    setDuration((oneSetWidth + viewportWidth) / 20);
  }, [comments]);

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 12,
      overflow: "hidden", height: 40, pointerEvents: "none",
      background: isNight ? "#000000" : "#ffffff",
    }}>
      <div
        ref={trackRef}
        style={{
          display: "flex", alignItems: "center", height: 40,
          width: "fit-content", whiteSpace: "nowrap",
          animationName: "commentTicker",
          animationDuration: `${duration}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {repeated.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: GAP, flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#428bff" }}>{c.nickname}</span>
            <span style={{ fontSize: 15, color: isNight ? "#ffffff" : "#222222" }}>{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CoursePlayer({ routeGeojson, waypoints, music, title, distanceKm, tags, photos, comments, authorName, authorAvatar, durationMin, onFullscreenChange }: CoursePlayerProps) {
  const isNight = tags.includes("야경") || tags.includes("심야");
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animFrameRef = useRef<number>(0);
  const carMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const polaroidLineRef = useRef<PolaroidLine | null>(null);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const progressRef = useRef(0);
  const pausedRef = useRef(false);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const lineRef = useRef<any>(null);
  const totalDistRef = useRef(0);
  const cumDistKmRef = useRef<number[]>([]);
  const coordsRef = useRef<[number, number][]>([]);
  const durationRef = useRef(60);
  const smoothBearingRef = useRef(0);
  const isFadingOut = useRef(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentWpIdx, setCurrentWpIdx] = useState(0);
  const wpRatiosRef = useRef<number[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [musicTitle, setMusicTitle] = useState<string>("재생 중");
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide GuestBanner during playback (body.player-playing → CSS-only)
  useEffect(() => {
    document.body.classList.toggle("player-playing", playing);
    return () => { document.body.classList.remove("player-playing"); };
  }, [playing]);

  // Fetch YouTube title via oEmbed
  useEffect(() => {
    if (!music) return;
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${music.videoId}&format=json`)
      .then((r) => r.json())
      .then((d) => { if (d.title) setMusicTitle(d.title); })
      .catch(() => {});
  }, [music]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!music) return;
    if (window.YT?.Player) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, [music]);

  // Create YT player
  useEffect(() => {
    if (!music) return;
    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player("yt-player-container", {
        width: 200, height: 112, videoId: music.videoId,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, start: music.startSec || 0, end: music.endSec || (music.startSec || 0) + FIXED_DURATION_SEC + 2 },
        events: { onReady: () => { playerReadyRef.current = true; } },
      });
    };
    if (window.YT?.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;
    return () => { if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null; playerReadyRef.current = false; } };
  }, [music]);

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    const coords = routeGeojson.coordinates;
    const midIdx = Math.floor(coords.length / 2);
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: isNight ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/outdoors-v12",
      language: "ko",
      center: coords[midIdx],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      maxTileCacheSize: 100,
    });
    map.current = m;

    m.on("load", () => {
      // Hide road labels + 등고선
      m.getStyle().layers.forEach((layer: any) => {
        if (layer.id.includes("road") && layer.id.includes("label")) {
          m.setLayoutProperty(layer.id, "visibility", "none");
        }
        if (layer.id.includes("contour")) {
          m.setLayoutProperty(layer.id, "visibility", "none");
        }
      });

      m.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      if (isNight) {
        // Sunset sky
        m.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 8.0],
            "sky-atmosphere-sun-intensity": 10,
            "sky-atmosphere-color": "#e87040",
            "sky-atmosphere-halo-color": "#f5a060",
          },
        });
        m.setLight({
          anchor: "viewport",
          color: "#f0a050",
          intensity: 0.6,
          position: [1.5, 180, 30],
        });
        // Dark silhouette buildings
        m.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#1a1520", 50, "#2a2030", 200, "#1e1525"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.92,
          },
        });
      } else {
        // Bright day sky — blue with warm sunlight
        m.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 75.0],
            "sky-atmosphere-sun-intensity": 12,
            "sky-atmosphere-color": "#8ec8f0",
            "sky-atmosphere-halo-color": "#f0e8d8",
          },
        });
        m.setLight({
          anchor: "viewport",
          color: "#fffaf0",
          intensity: 0.4,
          position: [1.5, 45, 50],
        });
        // Warm-toned buildings
        m.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 12,
            paint: {
              "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#f0ebe4", 50, "#e5ddd4", 200, "#d8d0c8"],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.8,
            },
          },
          "road-label"
        );
      }

      const remainColor = isNight ? "#7a6055" : "#b0c4d8";
      const traveledColor = isNight ? "#f59e42" : "#428bff"; // --color-info resolved (Mapbox GL paint: CSS vars unsupported)

      // Overview route — visible before/after animation
      m.addSource(OVERVIEW_SRC, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } } });
      m.addLayer({ id: OVERVIEW_LYR, type: "line", source: OVERVIEW_SRC, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": traveledColor, "line-width": 4, "line-opacity": 0.7 } });

      // Animation route layers — hidden initially
      m.addSource(REMAINING_SRC, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } } });
      m.addLayer({ id: REMAINING_LYR, type: "line", source: REMAINING_SRC, layout: { "line-join": "round", "line-cap": "round", visibility: "none" }, paint: { "line-color": remainColor, "line-width": 4, "line-opacity": isNight ? 0.4 : 0.35, "line-dasharray": [2, 2] } });
      m.addSource(TRAVELED_SRC, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
      m.addLayer({ id: TRAVELED_LYR, type: "line", source: TRAVELED_SRC, layout: { "line-join": "round", "line-cap": "round", visibility: "none" }, paint: { "line-color": traveledColor, "line-width": 5, "line-opacity": 0.9 } });

      waypoints.forEach((wp, i) => {
        const el = document.createElement("div");
        el.style.cssText = "width:28px;height:28px;border-radius:50%;background:var(--color-brand);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
        el.textContent = String(i + 1);
        new mapboxgl.Marker({ element: el }).setLngLat([wp.lng, wp.lat]).addTo(m);
      });

      // Fit camera to entire route
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      m.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 });
    });

    m.once("idle", () => {
      setMapReady(true);
    });

    return () => {
      try { m.setTerrain(null); } catch {}
      cancelAnimationFrame(animFrameRef.current);
      m.remove();
      map.current = null;
    };
  }, [routeGeojson, waypoints, isNight]);

  const updateScene = useCallback((ratio: number) => {
    const m = map.current;
    if (!m) return;
    const coords = coordsRef.current;
    const line = lineRef.current;
    const totalDistKm = totalDistRef.current;
    const cumDistKm = cumDistKmRef.current;
    if (!line || !coords.length) return;

    const currentDistKm = ratio * totalDistKm;
    const pos = (along(line, currentDistKm, { units: "kilometers" }).geometry.coordinates) as [number, number];
    const lookAhead = Math.min(currentDistKm + 0.05, totalDistKm);
    const aheadPos = (along(line, lookAhead, { units: "kilometers" }).geometry.coordinates) as [number, number];
    const bearing = getBearing(pos, aheadPos);

    if (carMarkerRef.current) {
      carMarkerRef.current.setLngLat(pos);
      carMarkerRef.current.setRotation(bearing);
    }

    let sliceIdx = coords.length;
    for (let i = 1; i < cumDistKm.length; i++) {
      if (cumDistKm[i] > currentDistKm) { sliceIdx = i; break; }
    }
    const traveled = [...coords.slice(0, sliceIdx), pos];
    const tSrc = m.getSource(TRAVELED_SRC) as mapboxgl.GeoJSONSource;
    if (tSrc && traveled.length >= 2) {
      tSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: traveled } });
    }

    // Smooth bearing interpolation (shortest arc)
    let diff = bearing - smoothBearingRef.current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    smoothBearingRef.current = (smoothBearingRef.current + diff * 0.008 + 360) % 360;

    // Zoom based on speed (km/s) — faster = more zoomed out
    const speedKmPerSec = totalDistRef.current / FIXED_DURATION_SEC;
    const animZoom = speedKmPerSec <= 0.1 ? 16 : speedKmPerSec <= 0.3 ? 15.5 : speedKmPerSec <= 0.6 ? 15 : speedKmPerSec <= 1 ? 14.5 : 14;
    m.jumpTo({ center: pos, bearing: smoothBearingRef.current, pitch: 60, zoom: animZoom, padding: { top: Math.round(m.getContainer().clientHeight * 0.3), bottom: 0, left: 0, right: 0 } });
  }, []);

  const resetAnim = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    popupsRef.current.forEach((p) => p.remove());
    popupsRef.current = [];
    if (carMarkerRef.current) { carMarkerRef.current.remove(); carMarkerRef.current = null; }
    if (polaroidLineRef.current) { polaroidLineRef.current.destroy(); polaroidLineRef.current = null; }
    progressRef.current = 0;
    pausedRef.current = false;
    isFadingOut.current = false;
    setElapsed(0);
    setCurrentWpIdx(0);
    const m = map.current;
    if (m) {
      const tSrc = m.getSource(TRAVELED_SRC) as mapboxgl.GeoJSONSource;
      if (tSrc) tSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        fadeVolume(playerRef.current, playerRef.current.getVolume?.() || 100, 0, 1000, () => {
          try { playerRef.current?.stopVideo(); } catch {}
        });
      } catch {}
    }
  }, []);

  const stopAnim = useCallback(() => {
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
    isFadingOut.current = false;
    if (playerRef.current && playerReadyRef.current) { try { playerRef.current.setVolume(100); playerRef.current.stopVideo(); } catch {} }
    resetAnim();
    setPlaying(false);
    setPaused(false);
    setFullscreen(false);
    onFullscreenChange?.(false);
    const m = map.current;
    if (m) {
      m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
      m.setLayoutProperty(OVERVIEW_LYR, "visibility", "visible");
      m.setLayoutProperty(REMAINING_LYR, "visibility", "none");
      m.setLayoutProperty(TRAVELED_LYR, "visibility", "none");
      setTimeout(() => {
        m.resize();
        const coords = routeGeojson?.coordinates ?? [];
        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach((c) => bounds.extend(c));
        m.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 800, pitch: 0, bearing: 0 });
      }, 100);
    }
  }, [resetAnim, stopMusic, routeGeojson]);

  const pauseStartRef = useRef(0);
  const wpPauseUntilRef = useRef(0);

  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      pauseStartRef.current = performance.now();
    } else {
      // Extend billboard pause timestamp by the paused duration
      const pausedMs = performance.now() - pauseStartRef.current;
      if (wpPauseUntilRef.current > 0) {
        wpPauseUntilRef.current += pausedMs;
      }
    }
    if (playerRef.current && playerReadyRef.current) {
      try {
        if (next) {
          // 일시정지: 즉시 멈춤
          if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
          playerRef.current.pauseVideo();
        } else {
          // 재개: 즉시 재생
          playerRef.current.setVolume(100);
          isFadingOut.current = false;
          playerRef.current.playVideo();
        }
      } catch {}
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (playerRef.current && playerReadyRef.current) { try { next ? playerRef.current.mute() : playerRef.current.unMute(); } catch {} }
      return next;
    });
  }, []);


  const syncMusicToProgress = useCallback((progressRatio: number) => {
    if (!music || !playerRef.current || !playerReadyRef.current) return;
    const startSec = music.startSec || 0;
    const endSec = music.endSec || startSec + durationRef.current;
    const target = startSec + (endSec - startSec) * progressRatio;
    if (target >= endSec) {
      try { fadeVolume(playerRef.current, playerRef.current.getVolume?.() || 100, 0, 800, () => { try { playerRef.current?.stopVideo(); } catch {} }); } catch {}
      return;
    }
    try { playerRef.current.seekTo(Math.max(startSec, target), true); } catch {}
  }, [music]);

  const seekTo = useCallback((ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    progressRef.current = clamped * durationRef.current;
    setElapsed(progressRef.current);
    updateScene(clamped);
    syncMusicToProgress(clamped);
  }, [updateScene, syncMusicToProgress]);

  const skipSeconds = useCallback((sec: number) => {
    const newProgress = Math.max(0, Math.min(durationRef.current, progressRef.current + sec));
    progressRef.current = newProgress;
    setElapsed(newProgress);
    const r = newProgress / durationRef.current;
    updateScene(r);
    syncMusicToProgress(r);
  }, [updateScene, syncMusicToProgress]);

  const play = () => {
    const m = map.current;
    if (!m || !mapReady) return;

    // 경유지 사진 프리로딩
    waypoints.forEach((wp) => { if (wp.photoUrl) { const img = new Image(); img.src = wp.photoUrl; } });

    // Enter CSS fullscreen
    setFullscreen(true);
    onFullscreenChange?.(true);
    setTimeout(() => map.current?.resize(), 100);

    // 진행 중인 fade out 정리
    if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
    isFadingOut.current = false;
    if (playerRef.current && playerReadyRef.current) { try { playerRef.current.setVolume(100); } catch {} }

    resetAnim();
    setPlaying(true);
    setPaused(false);

    // Switch from overview to animation layers
    m.setLayoutProperty(OVERVIEW_LYR, "visibility", "none");
    m.setLayoutProperty(REMAINING_LYR, "visibility", "visible");
    m.setLayoutProperty(TRAVELED_LYR, "visibility", "visible");

    const coords = routeGeojson.coordinates;
    coordsRef.current = coords;
    const line = lineString(coords);
    lineRef.current = line;
    const totalDist = turfLength(line, { units: "kilometers" });
    totalDistRef.current = totalDist;

    // No pause at billboard waypoints — marker keeps moving
    durationRef.current = FIXED_DURATION_SEC;

    const cumDistKm: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      cumDistKm.push(cumDistKm[i - 1] + haversineDistance(coords[i - 1], coords[i]) / 1000);
    }
    cumDistKmRef.current = cumDistKm;

    const rSrc = m.getSource(REMAINING_SRC) as mapboxgl.GeoJSONSource;
    rSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });

    const carMarker = new mapboxgl.Marker({ element: createCarMarkerEl(isNight), rotationAlignment: "map", pitchAlignment: "map" })
      .setLngLat(coords[0]).addTo(m);
    carMarkerRef.current = carMarker;

    // Create polaroid clothesline
    if (polaroidLineRef.current) polaroidLineRef.current.destroy();
    const polaroidLine = wrapperRef.current ? new PolaroidLine(wrapperRef.current) : null;
    polaroidLineRef.current = polaroidLine;

    // Billboard markers — created hidden, revealed on arrival
    // Collect indices of waypoints that have billboard content (not created yet — created on arrival)
    const billboardWpIndices: number[] = [];
    waypoints.forEach((wp, idx) => {
      if (wp.photoUrl || wp.memo) billboardWpIndices.push(idx);
    });

    // Track which waypoints have been visited (for billboard reveal + pause)
    const visitedWps = new Set<number>();
    wpPauseUntilRef.current = 0;

    if (music && playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.setVolume(0);
        const mStart = music.startSec || 0;
        const mEnd = music.endSec || mStart + FIXED_DURATION_SEC + 2;
        playerRef.current.loadVideoById({ videoId: music.videoId, startSeconds: mStart, endSeconds: mEnd });
        fadeVolume(playerRef.current, 0, 100, 1500);
      } catch {}
    }

    // Pre-compute waypoint positions along the route as ratio (0~1)
    const wpRatios: number[] = waypoints.map((wp: WaypointData) => {
      let minDist = Infinity;
      let bestIdx = 0;
      coords.forEach((c, ci) => {
        const d = haversineDistance([wp.lng, wp.lat], c);
        if (d < minDist) { minDist = d; bestIdx = ci; }
      });
      return cumDistKm[bestIdx] / totalDist;
    });
    wpRatiosRef.current = wpRatios;

    let lastTime: number | null = null;

    const animate = (ts: number) => {
      if (lastTime === null) lastTime = ts;
      const delta = (ts - lastTime) / 1000;
      lastTime = ts;

      // If user paused, keep looping but don't advance anything
      if (pausedRef.current) {
        lastTime = null; // reset so delta is 0 on resume
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      progressRef.current += delta;
      const ratio = Math.min(progressRef.current / durationRef.current, 1);

      // Check if car reached a billboard waypoint — trigger polaroid but keep moving
      for (const wpIdx of billboardWpIndices) {
        if (visitedWps.has(wpIdx)) continue;
        if (wpIdx === 0 || wpIdx === waypoints.length - 1) { visitedWps.add(wpIdx); continue; }
        const wpRatio = wpRatios[wpIdx];
        if (ratio >= wpRatio) {
          visitedWps.add(wpIdx);
          const wp = waypoints[wpIdx];
          if (polaroidLine) {
            polaroidLine.add(wp.photoUrl, wp.memo);
          }
        }
      }
      // Update current waypoint index
      let wpIdx = 0;
      for (let i = 0; i < wpRatios.length; i++) {
        if (ratio >= wpRatios[i]) wpIdx = i;
      }
      setCurrentWpIdx(wpIdx);
      setElapsed(progressRef.current);
      updateScene(ratio);
      // Start music fade out 2 seconds before animation ends (ratio-based)
      const fadeStartRatio = (durationRef.current - 2) / durationRef.current;
      if (ratio >= fadeStartRatio && !isFadingOut.current && playerRef.current && playerReadyRef.current) {
        isFadingOut.current = true;
        if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
        let vol = playerRef.current.getVolume?.() || 100;
        const step = vol / 20;
        fadeIntervalRef.current = setInterval(() => {
          vol = Math.max(0, vol - step);
          try { playerRef.current?.setVolume(Math.round(vol)); } catch {}
          if (vol <= 0) { if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; } try { playerRef.current?.stopVideo(); playerRef.current?.setVolume(100); } catch {} }
        }, 100);
      }

      if (ratio < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        const doReset = () => {
          resetAnim();
          setPlaying(false);
          setPaused(false);
          setFullscreen(false);
          onFullscreenChange?.(false);
          isFadingOut.current = false;
          m.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
          m.setLayoutProperty(OVERVIEW_LYR, "visibility", "visible");
          m.setLayoutProperty(REMAINING_LYR, "visibility", "none");
          m.setLayoutProperty(TRAVELED_LYR, "visibility", "none");
          setTimeout(() => {
            m.resize();
            const bounds = new mapboxgl.LngLatBounds();
            coords.forEach((c) => bounds.extend(c));
            m.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 1200, pitch: 0, bearing: 0 });
          }, 100);
        };

        // If music wasn't fading yet, fade now
        if (!isFadingOut.current && playerRef.current && playerReadyRef.current) {
          if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
          let currentVolume = playerRef.current.getVolume?.() || 100;
          const volumeStep = 5;
          fadeIntervalRef.current = setInterval(() => {
            currentVolume = Math.max(0, currentVolume - volumeStep);
            try { playerRef.current?.setVolume(Math.round(currentVolume)); } catch {}
            if (currentVolume <= 0) {
              if (fadeIntervalRef.current) { clearInterval(fadeIntervalRef.current); fadeIntervalRef.current = null; }
              try { playerRef.current?.stopVideo(); playerRef.current?.setVolume(100); } catch {}
              doReset();
            }
          }, 100);
        } else {
          // Music already faded or no music — just reset after short delay
          setTimeout(doReset, 500);
        }
      }
    };

    const initBearing = getBearing(coords[0], coords[Math.min(1, coords.length - 1)]);
    smoothBearingRef.current = initBearing;
    const spd = totalDist / FIXED_DURATION_SEC;
    const initZoom = spd <= 0.1 ? 16 : spd <= 0.3 ? 15.5 : spd <= 0.6 ? 15 : spd <= 1 ? 14.5 : 14;
    m.easeTo({ center: coords[0], zoom: initZoom, pitch: 60, bearing: initBearing, duration: 1000 });
    setTimeout(() => { animFrameRef.current = requestAnimationFrame(animate); }, 1100);
  };

  useEffect(() => { return () => { cancelAnimationFrame(animFrameRef.current); if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current); }; }, []);

  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }, [seekTo]);

  const ratio = Math.min(elapsed / durationRef.current, 1);
  const animActive = playing && !paused;

  const toggleFullscreen = useCallback(() => {
    setFullscreen((prev) => {
      const next = !prev;
      onFullscreenChange?.(next);
      setTimeout(() => map.current?.resize(), 100);
      return next;
    });
  }, [onFullscreenChange]);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!playing) { setControlsVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); return; }
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [playing, resetHideTimer]);

  return (
    <div
      ref={wrapperRef}
      onPointerMove={playing ? resetHideTimer : undefined}
      onPointerDown={playing ? resetHideTimer : undefined}
      onClick={playing ? resetHideTimer : undefined}
      style={{
        position: fullscreen ? "fixed" : "relative",
        inset: fullscreen ? 0 : undefined,
        width: fullscreen ? "100%" : "100%",
        aspectRatio: fullscreen ? undefined : "1/1",
        height: fullscreen ? "100%" : undefined,
        borderRadius: fullscreen ? 0 : 12,
        overflow: "hidden",
        zIndex: fullscreen ? 9999 : undefined,
        background: "#000",
      }}
    >
      {/* Map container */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden" }}>
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
        {isNight && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(232,112,64,0.18) 0%, rgba(245,160,96,0.08) 35%, transparent 60%, rgba(26,16,24,0.25) 100%)",
          }} />
        )}
      </div>

      {/* Fullscreen: X close (=stop), Normal: expand */}
      <button
        onClick={fullscreen ? stopAnim : toggleFullscreen}
        style={{
          position: "absolute", top: fullscreen ? 20 : 12, right: fullscreen ? 20 : 12, zIndex: 30,
          width: 32, height: 32, borderRadius: 8, border: "none",
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          opacity: (!playing || controlsVisible) ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: (!playing || controlsVisible) ? "auto" : "none",
        }}
      >
        {fullscreen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        )}
      </button>

      {/* Hidden YouTube player */}
      {music && (
        <div id="yt-player-container" style={{ position: "absolute", top: -9999, left: -9999, width: 200, height: 112, opacity: 0, pointerEvents: "none" }} />
      )}

      {/* Music mini player — outside map's overflow:hidden container */}
      {playing && music && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 28,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)",
          borderRadius: 40, padding: "8px 14px 8px 8px",
          minWidth: 200, maxWidth: "calc(100% - 112px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 10,
          pointerEvents: "auto",
        }}>
          {/* Vinyl record */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: "conic-gradient(#1a1a1a 0deg, #333 60deg, #1a1a1a 120deg, #333 180deg, #1a1a1a 240deg, #333 300deg, #1a1a1a 360deg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "vinylSpin 3s linear infinite",
            animationPlayState: animActive ? "running" : "paused",
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFFFFF" }} />
          </div>

          {/* Title + wave */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "#fff",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {musicTitle}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{
                  width: 3, borderRadius: 1, background: "rgba(255,255,255,0.7)",
                  height: animActive ? undefined : 4,
                  animation: animActive ? `wave 1s ease-in-out ${i * 0.15}s infinite` : "none",
                }} />
              ))}
            </div>
          </div>

          {/* Mute toggle */}
          <button onClick={toggleMute} style={{
            width: 28, height: 28, borderRadius: "50%", border: "none", flexShrink: 0,
            background: "rgba(255,255,255,0.15)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {muted
                ? <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
                : <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
            </svg>
          </button>
        </div>
      )}

      {/* Film photo overlay */}
      {playing && photos && photos.length > 0 && (
        <FilmOverlay photos={photos} ratio={ratio} />
      )}

      {/* Vertical progress bar — right side floating */}
      {playing && (
        <div style={{
          position: "absolute", right: 12, top: "35%", zIndex: 35,
          height: "50%", display: "flex", alignItems: "flex-end",
          pointerEvents: "none",
        }}>
          {/* Waypoint names (left of bar) */}
          <div style={{ position: "relative", height: "100%", marginRight: 2 }}>
            {wpRatiosRef.current.map((wr, i) => {
              const isCurrent = i === currentWpIdx;
              return (
                <div key={i} style={{
                  position: "absolute", right: 0,
                  bottom: `${wr * 100}%`,
                  transform: "translateY(50%)",
                  display: "flex", alignItems: "center",
                  transition: "all 0.3s",
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: isCurrent ? 700 : 400,
                    color: isCurrent ? "var(--color-brand)" : "rgba(255,255,255,0.45)",
                    background: isCurrent ? "#ffffff" : "rgba(0,0,0,0.25)",
                    borderRadius: 6, padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}>
                    {waypoints[i]?.name || ""}
                  </span>
                  {/* 말풍선 꼬리 */}
                  <div style={{
                    width: 0, height: 0, flexShrink: 0,
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderLeft: isCurrent ? "5px solid #ffffff" : "5px solid rgba(0,0,0,0.25)",
                    transition: "border-left-color 0.3s",
                  }} />
                </div>
              );
            })}
          </div>
          {/* Vertical bar + icon */}
          <div style={{ position: "relative", width: 20, height: "100%", display: "flex", justifyContent: "center" }}>
            {/* Bar track */}
            <div style={{ position: "absolute", width: 5, height: "100%", background: "#f2f2f2", borderRadius: 4, boxShadow: "0 0 0 2px #ffffff" }}>
              <div style={{
                position: "absolute", bottom: 0, left: 0, width: "100%",
                height: `${ratio * 100}%`,
                background: "linear-gradient(0deg, #ff385c, #ff6b8a)",
                borderRadius: 2,
              }} />
            </div>
            {/* Progress icon */}
            <img
              src="/icon-rounded.png"
              alt=""
              style={{
                position: "absolute",
                bottom: `${ratio * 100}%`,
                transform: "translateY(50%)",
                width: 18, height: 18, borderRadius: "50%",
                border: "1.5px solid #fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                zIndex: 2,
              }}
            />
            {/* Waypoint dots */}
            {wpRatiosRef.current.map((wr, i) => {
              const isEndpoint = i === 0 || i === waypoints.length - 1;
              const isCurrent = i === currentWpIdx;
              return (
                <div key={i} style={{
                  position: "absolute", left: "50%",
                  bottom: `${wr * 100}%`,
                  transform: "translate(-50%, 50%)",
                  width: isCurrent ? 11 : isEndpoint ? 9 : 5,
                  height: isCurrent ? 11 : isEndpoint ? 9 : 5,
                  borderRadius: "50%",
                  background: isCurrent ? "var(--color-brand)" : "#ffffff",
                  border: isCurrent || isEndpoint ? "2px solid #fff" : "1.5px solid #fff",
                  boxShadow: isEndpoint ? "0 0 0 2px #ffffff" : "none",
                  transition: "all 0.3s",
                  zIndex: 3,
                }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Author + course name banner */}
      {playing && (
        <div style={{
          position: "absolute", bottom: 40, left: 0, right: 0, zIndex: 14,
          height: 36, display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px",
          background: isNight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
          pointerEvents: "none",
        }}>
          {authorAvatar ? (
            <img src={authorAvatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#222", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {(authorName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: 11, fontWeight: 600, color: isNight ? "#fff" : "#222222" }}>{authorName || "루트북 유저"}</span>
          <span style={{ fontSize: 11, color: isNight ? "rgba(255,255,255,0.5)" : "#6a6a6a" }}>·</span>
          <span style={{ fontSize: 11, color: isNight ? "rgba(255,255,255,0.7)" : "#4D4D4D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ fontSize: 11, color: isNight ? "rgba(255,255,255,0.5)" : "#6a6a6a", flexShrink: 0 }}>{distanceKm}km{durationMin && durationMin > 0 ? ` · ${durationMin >= 60 ? `${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분` : `${durationMin}분`}` : ""}</span>
        </div>
      )}

      {/* Sliding comments */}
      {playing && (
        <CommentSlider
          comments={comments && comments.length > 0 ? comments : [{ nickname: "루트북", text: "아직 후기가 없어요. 첫 후기를 남겨보세요!" }]}
          paused={paused}
          isNight={isNight}
        />
      )}

      {/* Control bar */}
      {playing ? (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 15,
          background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
          padding: "40px 16px 14px", display: "flex", flexDirection: "column", gap: 8,
          opacity: controlsVisible ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: controlsVisible ? "auto" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>총 {distanceKm}km</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{fmtTime(elapsed)}</span>
            <div onClick={handleSeekBarClick} style={{ flex: 1, height: 16, cursor: "pointer", display: "flex", alignItems: "center", position: "relative" }}>
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, position: "relative" }}>
                <div style={{ width: `${ratio * 100}%`, height: "100%", background: "#FFFFFF", borderRadius: 2 }} />
                <div style={{ position: "absolute", top: "50%", left: `${ratio * 100}%`, transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{fmtTime(durationRef.current)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={togglePause} style={overlayBtn(34)}>
                {paused ? <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="5" y="3" width="5" height="18" /><rect x="14" y="3" width="5" height="18" /></svg>}
              </button>
              <button onClick={() => skipSeconds(-10)} style={overlayBtn(30)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              </button>
              <button onClick={() => skipSeconds(10)} style={overlayBtn(30)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
              </button>
              <button onClick={stopAnim} style={overlayBtn(30)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
              </button>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 4 }}>
              <span>📍</span> {currentWpIdx} / {waypoints.length}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 15,
          background: "linear-gradient(transparent, rgba(0,0,0,0.45))",
          padding: "32px 16px 16px", display: "flex", justifyContent: "center",
          pointerEvents: "auto",
        }}>
          <button
            onClick={() => play()}
            disabled={!mapReady}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 40, border: "none",
              background: mapReady ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)", color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: mapReady ? "pointer" : "wait",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)", opacity: mapReady ? 1 : 0.6,
            }}
          >
            {mapReady ? (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21" /></svg>코스 미리보기</>
            ) : (
              <>지도 로딩 중...</>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes vinylSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wave { 0%, 100% { height: 4px; } 50% { height: 12px; } }
        @keyframes commentTicker { from { transform: translateX(100vw); } to { transform: translateX(calc(100vw - 133.333%)); } }
      `}</style>
    </div>
  );
}

function overlayBtn(size: number): React.CSSProperties {
  return {
    width: size, height: size, borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.15)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
