"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { lineString, length as turfLength, along } from "@turf/turf";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const BASE_DURATION_SEC = 60;
const TRAVELED_SRC = "traveled";
const TRAVELED_LYR = "traveled-line";
const REMAINING_SRC = "remaining";
const REMAINING_LYR = "remaining-line";
const SPEED_OPTIONS = [1, 1.5, 2, 0.5];

interface MusicData { videoId: string; startSec: number; endSec: number | null; }
interface WaypointData { lng: number; lat: number; name: string; }
interface CoursePlayerProps {
  routeGeojson: { type: string; coordinates: [number, number][] };
  waypoints: WaypointData[];
  music: MusicData | null;
  title: string;
  distanceKm: number;
  tags: string[];
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

function createCarMarkerEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:40px;height:40px;";
  el.innerHTML = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" fill="#1e293b" stroke="#fff" stroke-width="2.5"/>
    <path d="M20 10 L27 26 L20 22 L13 26 Z" fill="#3b82f6"/>
  </svg>`;
  return el;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

declare global { interface Window { YT: any; onYouTubeIframeAPIReady: (() => void) | undefined; } }

export default function CoursePlayer({ routeGeojson, waypoints, music, title, distanceKm }: CoursePlayerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animFrameRef = useRef<number>(0);
  const carMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const progressRef = useRef(0);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const lineRef = useRef<any>(null);
  const totalDistRef = useRef(0);
  const cumDistKmRef = useRef<number[]>([]);
  const coordsRef = useRef<[number, number][]>([]);
  const triggeredSetRef = useRef(new Set<string>());

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [currentWpIdx, setCurrentWpIdx] = useState(0);
  const [wpNotification, setWpNotification] = useState<{ name: string; distKm: number } | null>(null);
  const [musicTitle, setMusicTitle] = useState<string>("재생 중");

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
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, start: music.startSec || 0, end: music.endSec || undefined },
        events: { onReady: () => { playerReadyRef.current = true; } },
      });
    };
    if (window.YT?.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;
    return () => { if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null; playerReadyRef.current = false; } };
  }, [music]);

  // Init map with Standard style + 3D terrain + buildings
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    const coords = routeGeojson.coordinates;
    const midIdx = Math.floor(coords.length / 2);
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      language: "ko",
      center: coords[midIdx],
      zoom: 12,
      pitch: 0,
      bearing: 0,
    });
    map.current = m;

    m.on("load", () => {
      m.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      m.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 90.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });

      m.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#e8e0d8", 50, "#d4ccc4", 200, "#c0b8b0"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.85,
          },
        },
        "road-label"
      );

      m.addSource(REMAINING_SRC, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } } });
      m.addLayer({ id: REMAINING_LYR, type: "line", source: REMAINING_SRC, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#94a3b8", "line-width": 4, "line-opacity": 0.35, "line-dasharray": [2, 2] } });
      m.addSource(TRAVELED_SRC, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
      m.addLayer({ id: TRAVELED_LYR, type: "line", source: TRAVELED_SRC, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#3b82f6", "line-width": 5, "line-opacity": 0.9 } });

      waypoints.forEach((wp, i) => {
        const el = document.createElement("div");
        el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#ef4444;color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);";
        el.textContent = String(i + 1);
        new mapboxgl.Marker({ element: el }).setLngLat([wp.lng, wp.lat]).addTo(m);
      });
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
  }, [routeGeojson, waypoints]);

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
    const lookAhead = Math.min(currentDistKm + 0.01, totalDistKm);
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

    m.easeTo({ center: pos, bearing, pitch: 60, zoom: 16, duration: 100, easing: (t) => t });

    let reached = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const key = `${wp.lng},${wp.lat}`;
      const dist = haversineDistance(pos, [wp.lng, wp.lat]);
      if (dist < 80 && !triggeredSetRef.current.has(key)) {
        triggeredSetRef.current.add(key);
        reached = i + 1;
        setWpNotification({ name: wp.name, distKm: +(currentDistKm).toFixed(1) });
        setTimeout(() => setWpNotification(null), 2500);
      }
      if (triggeredSetRef.current.has(key)) reached = i + 1;
    }
    setCurrentWpIdx(reached);
  }, [waypoints]);

  const resetAnim = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    popupsRef.current.forEach((p) => p.remove());
    popupsRef.current = [];
    if (carMarkerRef.current) { carMarkerRef.current.remove(); carMarkerRef.current = null; }
    progressRef.current = 0;
    pausedRef.current = false;
    triggeredSetRef.current = new Set();
    setElapsed(0);
    setCurrentWpIdx(0);
    setWpNotification(null);
    const m = map.current;
    if (m) {
      const tSrc = m.getSource(TRAVELED_SRC) as mapboxgl.GeoJSONSource;
      if (tSrc) tSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (playerRef.current && playerReadyRef.current) { try { playerRef.current.stopVideo(); } catch {} }
  }, []);

  const stopAnim = useCallback(() => {
    resetAnim();
    stopMusic();
    setPlaying(false);
    setPaused(false);
    const m = map.current;
    if (m) {
      const coords = routeGeojson.coordinates;
      m.easeTo({ pitch: 0, bearing: 0, zoom: 12, center: coords[Math.floor(coords.length / 2)], duration: 800 });
    }
  }, [resetAnim, stopMusic, routeGeojson]);

  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (playerRef.current && playerReadyRef.current) { try { next ? playerRef.current.pauseVideo() : playerRef.current.playVideo(); } catch {} }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (playerRef.current && playerReadyRef.current) { try { next ? playerRef.current.mute() : playerRef.current.unMute(); } catch {} }
      return next;
    });
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((prev) => {
      const next = (prev + 1) % SPEED_OPTIONS.length;
      speedRef.current = SPEED_OPTIONS[next];
      return next;
    });
  }, []);

  const syncMusicToProgress = useCallback((progressRatio: number) => {
    if (!music || !playerRef.current || !playerReadyRef.current) return;
    const startSec = music.startSec || 0;
    const endSec = music.endSec || startSec + BASE_DURATION_SEC;
    const target = startSec + (endSec - startSec) * progressRatio;
    if (target >= endSec) { try { playerRef.current.stopVideo(); } catch {} return; }
    try { playerRef.current.seekTo(Math.max(startSec, target), true); } catch {}
  }, [music]);

  const seekTo = useCallback((ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    progressRef.current = clamped * BASE_DURATION_SEC;
    setElapsed(progressRef.current);
    updateScene(clamped);
    syncMusicToProgress(clamped);
  }, [updateScene, syncMusicToProgress]);

  const skipSeconds = useCallback((sec: number) => {
    const newProgress = Math.max(0, Math.min(BASE_DURATION_SEC, progressRef.current + sec));
    progressRef.current = newProgress;
    setElapsed(newProgress);
    const r = newProgress / BASE_DURATION_SEC;
    updateScene(r);
    syncMusicToProgress(r);
  }, [updateScene, syncMusicToProgress]);

  const play = () => {
    const m = map.current;
    if (!m || !mapReady) return;

    resetAnim();
    setPlaying(true);
    setPaused(false);

    const coords = routeGeojson.coordinates;
    coordsRef.current = coords;
    const line = lineString(coords);
    lineRef.current = line;
    const totalDist = turfLength(line, { units: "kilometers" });
    totalDistRef.current = totalDist;

    const cumDistKm: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      cumDistKm.push(cumDistKm[i - 1] + haversineDistance(coords[i - 1], coords[i]) / 1000);
    }
    cumDistKmRef.current = cumDistKm;

    const rSrc = m.getSource(REMAINING_SRC) as mapboxgl.GeoJSONSource;
    rSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });

    const carMarker = new mapboxgl.Marker({ element: createCarMarkerEl(), rotationAlignment: "map", pitchAlignment: "map" })
      .setLngLat(coords[0]).addTo(m);
    carMarkerRef.current = carMarker;

    if (music && playerRef.current && playerReadyRef.current) {
      try { playerRef.current.loadVideoById({ videoId: music.videoId, startSeconds: music.startSec || 0, endSeconds: music.endSec || undefined }); } catch {}
    }

    let lastTime: number | null = null;
    const animate = (ts: number) => {
      if (lastTime === null) lastTime = ts;
      const delta = (ts - lastTime) / 1000;
      lastTime = ts;
      if (!pausedRef.current) progressRef.current += delta * speedRef.current;
      const ratio = Math.min(progressRef.current / BASE_DURATION_SEC, 1);
      setElapsed(progressRef.current);
      updateScene(ratio);
      if (ratio < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        stopMusic();
        setTimeout(() => {
          resetAnim();
          setPlaying(false);
          setPaused(false);
          m.easeTo({ pitch: 0, bearing: 0, zoom: 12, center: coords[Math.floor(coords.length / 2)], duration: 1200 });
        }, 2000);
      }
    };

    const initBearing = getBearing(coords[0], coords[Math.min(1, coords.length - 1)]);
    m.easeTo({ center: coords[0], zoom: 16, pitch: 60, bearing: initBearing, duration: 1000 });
    setTimeout(() => { animFrameRef.current = requestAnimationFrame(animate); }, 1100);
  };

  useEffect(() => { return () => { cancelAnimationFrame(animFrameRef.current); }; }, []);

  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }, [seekTo]);

  const ratio = Math.min(elapsed / BASE_DURATION_SEC, 1);
  const animActive = playing && !paused;

  return (
    <div style={{ position: "relative", width: "100%", height: "70vh", borderRadius: 12, overflow: "hidden" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Hidden YouTube player */}
      {music && (
        <div id="yt-player-container" style={{ position: "absolute", top: -9999, left: -9999, width: 200, height: 112, opacity: 0, pointerEvents: "none" }} />
      )}

      {/* Music mini player */}
      {playing && music && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 30,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)",
          borderRadius: 40, padding: "8px 14px 8px 8px",
          minWidth: 200, maxWidth: 280,
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
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />
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

      {/* Waypoint notification card */}
      {wpNotification && (
        <div style={{
          position: "absolute", bottom: playing ? 140 : 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: "10px 18px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 20, animation: "slideUp 0.3s ease-out",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>📍</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{wpNotification.name}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>출발에서 {wpNotification.distKm}km 지점</div>
          </div>
        </div>
      )}

      {/* Control bar */}
      {playing ? (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 15,
          background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
          padding: "40px 16px 14px", display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>총 {distanceKm}km · 경유지 {waypoints.length}곳</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{fmtTime(elapsed)}</span>
            <div onClick={handleSeekBarClick} style={{ flex: 1, height: 16, cursor: "pointer", display: "flex", alignItems: "center", position: "relative" }}>
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, position: "relative" }}>
                <div style={{ width: `${ratio * 100}%`, height: "100%", background: "#fff", borderRadius: 2 }} />
                <div style={{ position: "absolute", top: "50%", left: `${ratio * 100}%`, transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{fmtTime(BASE_DURATION_SEC)}</span>
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
              <button onClick={cycleSpeed} style={{ ...overlayBtn(30), fontSize: 11, fontWeight: 700, color: "#fff", minWidth: 38 }}>
                {SPEED_OPTIONS[speedIdx]}x
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
