"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/lib/supabase";
import LoginModal from "./LoginModal";
import Toast from "./Toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { lineString, length as turfLength, along, distance as turfDistance, point } from "@turf/turf";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const ROUTE_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];
const PREVIEW_SOURCE = "preview-line";
const PREVIEW_LAYER = "preview-line-layer";
const WAYPOINT_ROUTE_SOURCE = "route-source";
const WAYPOINT_ROUTE_LAYER = "route";
const CLICK_THRESHOLD = 5; // px — under this = click, over = drag
const TAG_OPTIONS = ["야경", "힐링", "해안", "산길", "드라이브 데이트", "단풍", "새벽", "일출", "지름길"] as const;
const ANIM_TRAVELED_SOURCE = "anim-traveled";
const ANIM_TRAVELED_LAYER = "anim-traveled-line";
const ANIM_REMAINING_SOURCE = "anim-remaining";
const ANIM_REMAINING_LAYER = "anim-remaining-line";
const ANIM_DURATION_SEC = 40; // total playback time in seconds

function extractVideoId(url: string): string | null {
  const longMatch = url.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

function isValidYoutubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

function getBearing(from: [number, number], to: [number, number]): number {
  const dLng = ((to[0] - from[0]) * Math.PI) / 180;
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
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

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

interface Route {
  coords: [number, number][];
  duration: number;
  distance: number;
}

interface Waypoint {
  id: string;
  lng: number;
  lat: number;
  name: string;
}

async function fetchRoutes(
  start: [number, number],
  end: [number, number]
): Promise<Route[]> {
  const coordStr = `${start.join(",")};${end.join(",")}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?geometries=geojson&overview=full&alternatives=true&access_token=${mapboxgl.accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes?.length) return [];
  return data.routes.slice(0, 3).map((r: any) => ({
    coords: r.geometry.coordinates,
    duration: r.duration,
    distance: r.distance,
  }));
}

async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=ko&types=poi,address,neighborhood,locality&limit=1&access_token=${mapboxgl.accessToken}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.[0]) return data.features[0].text;
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function createNumberedMarkerEl(num: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:28px;height:28px;border-radius:50%;
    background:#ef4444;color:#fff;font-weight:700;font-size:13px;
    display:flex;align-items:center;justify-content:center;
    border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    cursor:pointer;
  `;
  el.textContent = String(num);
  return el;
}

function SortableWaypointItem({
  wp,
  index,
  isLast,
  onRemove,
}: {
  wp: Waypoint;
  index: number;
  isLast: boolean;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: wp.id });
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px 10px 8px",
    borderBottom: isLast ? "none" : "1px solid #f1f5f9",
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "#f1f5f9" : "#fff",
    zIndex: isDragging ? 50 : "auto",
    borderRadius: isDragging ? 8 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span
        {...listeners}
        style={{
          cursor: "grab",
          color: "#94a3b8",
          fontSize: 16,
          lineHeight: 1,
          padding: "0 2px",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        ⠿
      </span>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#ef4444",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "#334155",
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {wp.name}
      </span>
      <button
        onClick={() => onRemove(wp.id)}
        style={{
          width: 24,
          height: 24,
          border: "none",
          background: "transparent",
          color: "#94a3b8",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
      >
        ✕
      </button>
    </div>
  );
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const isDrawing = useRef(false);
  const startPt = useRef<[number, number] | null>(null);
  const mouseDownPt = useRef<{ x: number; y: number } | null>(null);
  const markersRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(new globalThis.Map());

  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [waypointRouteSummary, setWaypointRouteSummary] = useState<{ distance: number; duration: number } | null>(null);
  const [routeGeojson, setRouteGeojson] = useState<object | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseTags, setCourseTags] = useState<string[]>([]);
  const [courseDesc, setCourseDesc] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [startMin, setStartMin] = useState("");
  const [startSecInput, setStartSecInput] = useState("");
  const [endMin, setEndMin] = useState("");
  const [endSecInput, setEndSecInput] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const previewPlayerRef = useRef<any>(null);
  const previewReadyRef = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const addingWaypointRef = useRef(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animFrameRef = useRef<number>(0);
  const animPopupsRef = useRef<mapboxgl.Popup[]>([]);
  const carMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animProgressRef = useRef<number>(0);
  const pausedRef = useRef(false);

  const router = useRouter();

  const handleMusicUrlChange = useCallback((url: string) => {
    setMusicUrl(url);
    const id = extractVideoId(url);
    setVideoId(id ?? "");
  }, []);

  const musicStartSec = (parseInt(startMin || "0") * 60) + parseInt(startSecInput || "0");
  const musicEndSec = (parseInt(endMin || "0") * 60) + parseInt(endSecInput || "0");
  const musicUrlTouched = musicUrl.length > 0;
  const musicUrlValid = isValidYoutubeUrl(musicUrl);

  // YouTube IFrame API for preview
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("yt-iframe-api")) return;
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (previewPlayerRef.current) {
        previewPlayerRef.current.destroy();
        previewPlayerRef.current = null;
        previewReadyRef.current = false;
      }

      const container = document.getElementById("yt-preview-container");
      if (!container) return;
      container.innerHTML = "";
      const div = document.createElement("div");
      div.id = "yt-preview-player";
      container.appendChild(div);

      previewPlayerRef.current = new (window as any).YT.Player("yt-preview-player", {
        width: 220,
        height: 124,
        videoId,
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1 },
        events: {
          onReady: () => { previewReadyRef.current = true; },
          onStateChange: (e: any) => {
            // YT.PlayerState.ENDED === 0
            if (e.data === 0) {
              setPreviewing(false);
              if (previewTimerRef.current) clearInterval(previewTimerRef.current);
            }
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      if (previewPlayerRef.current?.destroy) {
        previewPlayerRef.current.destroy();
        previewPlayerRef.current = null;
        previewReadyRef.current = false;
      }
    };
  }, [videoId]);

  const handlePreviewPlay = useCallback(() => {
    const p = previewPlayerRef.current;
    if (!p || !previewReadyRef.current) return;

    if (previewing) {
      p.pauseVideo();
      setPreviewing(false);
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      return;
    }

    p.seekTo(musicStartSec, true);
    p.playVideo();
    setPreviewing(true);

    // Poll to stop at endSec
    if (musicEndSec > musicStartSec) {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      previewTimerRef.current = setInterval(() => {
        try {
          const current = p.getCurrentTime?.();
          if (current >= musicEndSec) {
            p.pauseVideo();
            setPreviewing(false);
            if (previewTimerRef.current) clearInterval(previewTimerRef.current);
          }
        } catch {}
      }, 300);
    }
  }, [previewing, musicStartSec, musicEndSec]);

  const toggleTag = useCallback((tag: string) => {
    setCourseTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 3 ? prev : [...prev, tag]
    );
  }, []);

  const handleSaveCourse = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShowLogin(true);
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.from("courses").insert({
      user_id: user.id,
      title: courseTitle,
      description: courseDesc,
      tags: courseTags,
      waypoints: waypoints.map(({ lng, lat, name }) => ({ lng, lat, name })),
      route_geojson: routeGeojson,
      distance_km: waypointRouteSummary ? +(waypointRouteSummary.distance / 1000).toFixed(1) : 0,
      duration_min: waypointRouteSummary ? Math.round(waypointRouteSummary.duration / 60) : 0,
      music: videoId ? { videoId, startSec: musicStartSec, endSec: musicEndSec || null } : null,
    }).select("id").single();

    setSaving(false);

    if (error) {
      setToast({ message: `저장 실패: ${error.message}`, type: "error" });
      return;
    }

    router.push(`/course/${data.id}`);
  }, [courseTitle, courseTags, courseDesc, waypoints, waypointRouteSummary, routeGeojson, router, videoId, musicStartSec, musicEndSec]);

  const resetAnimation = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animPopupsRef.current.forEach((p) => p.remove());
    animPopupsRef.current = [];
    if (carMarkerRef.current) {
      carMarkerRef.current.remove();
      carMarkerRef.current = null;
    }
    animProgressRef.current = 0;
    pausedRef.current = false;
    const m = map.current;
    if (m) {
      const emptyLine = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [] as [number, number][] } };
      const tSrc = m.getSource(ANIM_TRAVELED_SOURCE) as mapboxgl.GeoJSONSource;
      const rSrc = m.getSource(ANIM_REMAINING_SOURCE) as mapboxgl.GeoJSONSource;
      if (tSrc) tSrc.setData(emptyLine);
      if (rSrc) rSrc.setData(emptyLine);
    }
  }, []);

  const stopAnimation = useCallback(() => {
    resetAnimation();
    setPlaying(false);
    setPaused(false);
    const m = map.current;
    if (m) {
      m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "visible");
      m.easeTo({ pitch: 0, bearing: 0, zoom: 11, duration: 800 });
    }
  }, [resetAnimation]);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const playAnimation = useCallback(() => {
    const m = map.current;
    const geojson = routeGeojson as { type: string; coordinates: [number, number][] } | null;
    if (!m || !geojson?.coordinates?.length || waypoints.length < 2) return;

    resetAnimation();
    setPlaying(true);
    setPaused(false);

    const coords = geojson.coordinates;
    const line = lineString(coords);
    const totalDistKm = turfLength(line, { units: "kilometers" });

    const tSrc = m.getSource(ANIM_TRAVELED_SOURCE) as mapboxgl.GeoJSONSource;
    const rSrc = m.getSource(ANIM_REMAINING_SOURCE) as mapboxgl.GeoJSONSource;

    // Hide static route, show faded full route
    m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "none");
    rSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });

    // Create car marker
    const carEl = createCarMarkerEl();
    const carMarker = new mapboxgl.Marker({ element: carEl, rotationAlignment: "map", pitchAlignment: "map" })
      .setLngLat(coords[0])
      .addTo(m);
    carMarkerRef.current = carMarker;

    // Pre-compute cumulative distances for slicing the traveled path
    const cumDist: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      const d = turfDistance(point(coords[i - 1]), point(coords[i]), { units: "kilometers" });
      cumDist.push(cumDist[i - 1] + d);
    }

    const triggeredSet = new Set<string>();
    let lastTime: number | null = null;

    const animate = (timestamp: number) => {
      if (lastTime === null) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (!pausedRef.current) {
        animProgressRef.current += delta;
      }

      const elapsed = animProgressRef.current;
      const ratio = Math.min(elapsed / ANIM_DURATION_SEC, 1);
      const currentDistKm = ratio * totalDistKm;

      // Current position via along (distance-based, uniform speed)
      const currentPt = along(line, currentDistKm, { units: "kilometers" });
      const pos = currentPt.geometry.coordinates as [number, number];

      // Bearing: compare current point with a point slightly ahead (+0.01km)
      const lookAheadDist = Math.min(currentDistKm + 0.01, totalDistKm);
      const aheadPt = along(line, lookAheadDist, { units: "kilometers" });
      const aheadPos = aheadPt.geometry.coordinates as [number, number];
      const bearing = getBearing(pos, aheadPos);

      // Update car marker
      carMarker.setLngLat(pos);
      carMarker.setRotation(bearing);

      // Build traveled path: all coords up to currentDist + current pos
      const sliceIdx = cumDist.findIndex((d) => d > currentDistKm);
      const traveledCoords = sliceIdx === -1
        ? [...coords, pos]
        : [...coords.slice(0, sliceIdx), pos];
      if (traveledCoords.length >= 2) {
        tSrc.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: traveledCoords } });
      }

      // Camera follow
      m.easeTo({
        center: pos,
        bearing,
        pitch: 50,
        zoom: 15,
        duration: 120,
        easing: (t) => t,
      });

      // Waypoint proximity (~50m)
      for (const wp of waypoints) {
        if (triggeredSet.has(wp.id)) continue;
        const dist = haversineDistance(pos, [wp.lng, wp.lat]);
        if (dist < 50) {
          triggeredSet.add(wp.id);
          const popupEl = document.createElement("div");
          popupEl.style.cssText = "opacity:0;transition:opacity 0.5s;font-weight:700;font-size:14px;color:#1e293b;padding:6px 10px;";
          popupEl.textContent = wp.name;
          const popup = new mapboxgl.Popup({ closeOnClick: false, closeButton: false, offset: 30 })
            .setLngLat([wp.lng, wp.lat])
            .setDOMContent(popupEl)
            .addTo(m);
          animPopupsRef.current.push(popup);
          requestAnimationFrame(() => { popupEl.style.opacity = "1"; });
          setTimeout(() => {
            popupEl.style.opacity = "0";
            setTimeout(() => popup.remove(), 500);
          }, 2500);
        }
      }

      if (ratio < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          resetAnimation();
          setPlaying(false);
          setPaused(false);
          m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "visible");
          m.easeTo({ pitch: 0, bearing: 0, zoom: 11, center: coords[Math.floor(coords.length / 2)], duration: 1200 });
        }, 2000);
      }
    };

    // Zoom in to start
    const initBearing = getBearing(coords[0], coords[Math.min(1, coords.length - 1)]);
    m.easeTo({ center: coords[0], zoom: 15, pitch: 50, bearing: initBearing, duration: 1000 });
    setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, 1100);
  }, [routeGeojson, waypoints, resetAnimation]);

  // We need refs to track state inside map event handlers
  const waypointsRef = useRef<Waypoint[]>([]);
  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);
  useEffect(() => {
    addingWaypointRef.current = addingWaypoint;
    const m = map.current;
    if (m) m.getCanvas().style.cursor = addingWaypoint ? "crosshair" : "";
  }, [addingWaypoint]);

  const handleLocateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setToast({ message: "이 브라우저에서 위치 기능을 지원하지 않습니다", type: "error" });
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const m = map.current;
        if (!m) return;
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;

        // Remove previous location marker
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.remove();
        }

        // Create blue dot with pulse ring
        const el = document.createElement("div");
        el.style.cssText = "position:relative;width:28px;height:28px;";
        el.innerHTML = `
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.2);animation:locPulse 2s ease-out infinite;"></div>
          <div style="position:absolute;top:7px;left:7px;width:14px;height:14px;border-radius:50%;background:#3B82F6;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
        `;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(m);
        userLocationMarkerRef.current = marker;

        m.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 });
      },
      () => {
        setLocatingUser(false);
        setToast({ message: "위치 권한을 허용해주세요", type: "error" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const clearRoutes = useCallback(() => {
    const m = map.current;
    if (!m) return;
    for (let i = 0; i < 3; i++) {
      const src = m.getSource(`route-${i}`) as mapboxgl.GeoJSONSource;
      if (src) {
        src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
      }
    }
  }, []);

  const drawRoutes = useCallback((routes: Route[], selected: number | null) => {
    const m = map.current;
    if (!m) return;
    const order = routes.map((_, i) => i).sort((a, b) => {
      if (a === selected) return 1;
      if (b === selected) return -1;
      return 0;
    });
    for (const i of order) {
      const src = m.getSource(`route-${i}`) as mapboxgl.GeoJSONSource;
      if (src) {
        src.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routes[i].coords },
        });
      }
      const isActive = i === selected;
      m.setPaintProperty(`route-${i}-line`, "line-opacity", isActive ? 0.9 : 0.4);
      m.setPaintProperty(`route-${i}-line`, "line-width", isActive ? 6 : 4);
    }
  }, []);

  const selectRoute = useCallback((idx: number) => {
    setSelectedIdx(idx);
    drawRoutes(routes, idx);
  }, [routes, drawRoutes]);

  useEffect(() => {
    if (routes.length === 0) return;
    const active = hoveredIdx ?? selectedIdx;
    drawRoutes(routes, active);
  }, [hoveredIdx, selectedIdx, routes, drawRoutes]);

  const addWaypoint = useCallback((lng: number, lat: number) => {
    const m = map.current;
    if (!m) return;

    const id = crypto.randomUUID();
    const num = waypointsRef.current.length + 1;
    const el = createNumberedMarkerEl(num);
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(m);

    markersRef.current.set(id, marker);

    // Add with coordinate name first, then update with geocoded name
    const wp: Waypoint = { id, lng, lat, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    setWaypoints((prev) => [...prev, wp]);

    reverseGeocode(lng, lat).then((name) => {
      setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
    });
  }, []);

  const renumberMarkers = useCallback((wps: Waypoint[]) => {
    wps.forEach((w, i) => {
      const m = markersRef.current.get(w.id);
      if (m) m.getElement().textContent = String(i + 1);
    });
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    const marker = markersRef.current.get(id);
    if (marker) {
      marker.remove();
      markersRef.current.delete(id);
    }
    setWaypoints((prev) => {
      const next = prev.filter((w) => w.id !== id);
      renumberMarkers(next);
      return next;
    });
  }, [renumberMarkers]);

  const reorderWaypoints = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWaypoints((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id);
      const newIdx = prev.findIndex((w) => w.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      renumberMarkers(next);
      return next;
    });
  }, [renumberMarkers]);

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      language: "ko",
      center: [126.978, 37.5665],
      zoom: 11,
    });
    map.current = m;

    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    m.on("load", () => {

      m.addSource(PREVIEW_SOURCE, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      m.addLayer({
        id: PREVIEW_LAYER,
        type: "line",
        source: PREVIEW_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#94a3b8", "line-width": 2, "line-dasharray": [4, 3] },
      });

      for (let i = 0; i < 3; i++) {
        m.addSource(`route-${i}`, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
        });
        m.addLayer({
          id: `route-${i}-line`,
          type: "line",
          source: `route-${i}`,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": ROUTE_COLORS[i], "line-width": 4, "line-opacity": 0.4 },
        });
      }

      // Waypoint route layer
      m.addSource(WAYPOINT_ROUTE_SOURCE, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      m.addLayer({
        id: WAYPOINT_ROUTE_LAYER,
        type: "line",
        source: WAYPOINT_ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3B82F6", "line-width": 4 },
      });

      // Animation layers
      m.addSource(ANIM_REMAINING_SOURCE, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      m.addLayer({
        id: ANIM_REMAINING_LAYER,
        type: "line",
        source: ANIM_REMAINING_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#94a3b8", "line-width": 4, "line-opacity": 0.35, "line-dasharray": [2, 2] },
      });
      m.addSource(ANIM_TRAVELED_SOURCE, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      m.addLayer({
        id: ANIM_TRAVELED_LAYER,
        type: "line",
        source: ANIM_TRAVELED_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3b82f6", "line-width": 5, "line-opacity": 0.9 },
      });
    });

    m.on("mousedown", (e) => {
      if (e.originalEvent.button !== 0) return;
      mouseDownPt.current = { x: e.point.x, y: e.point.y };
      startPt.current = [e.lngLat.lng, e.lngLat.lat];
    });

    m.on("mousemove", (e) => {
      if (!mouseDownPt.current || !startPt.current) return;

      // Start drag only after threshold
      if (!isDrawing.current) {
        const dx = e.point.x - mouseDownPt.current.x;
        const dy = e.point.y - mouseDownPt.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD) return;

        // Begin drag
        isDrawing.current = true;
        setRoutes([]);
        setSelectedIdx(null);
        setHoveredIdx(null);
        clearRoutes();
        m.dragPan.disable();
        m.getCanvas().style.cursor = "crosshair";
      }

      const preview = m.getSource(PREVIEW_SOURCE) as mapboxgl.GeoJSONSource;
      if (preview) {
        preview.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [startPt.current, [e.lngLat.lng, e.lngLat.lat]] },
        });
      }
    });

    m.on("mouseup", (e) => {
      const wasDrawing = isDrawing.current;
      isDrawing.current = false;
      m.dragPan.enable();
      m.getCanvas().style.cursor = "";

      if (wasDrawing) {
        // Finish drag → fetch routes
        const preview = m.getSource(PREVIEW_SOURCE) as mapboxgl.GeoJSONSource;
        if (preview) preview.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });

        const start = startPt.current;
        const end: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        if (start) {
          fetchRoutes(start, end).then((fetched) => {
            if (fetched.length === 0) return;
            setRoutes(fetched);
            setSelectedIdx(0);
          });
        }
      } else if (mouseDownPt.current && addingWaypointRef.current) {
        // Click → add waypoint (only in add mode)
        addWaypoint(e.lngLat.lng, e.lngLat.lat);
      }

      mouseDownPt.current = null;
      startPt.current = null;
    });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      m.remove();
      map.current = null;
    };
  }, [clearRoutes, addWaypoint]);

  useEffect(() => {
    if (routes.length > 0) {
      drawRoutes(routes, selectedIdx ?? 0);
    }
  }, [routes, selectedIdx, drawRoutes]);

  // Compute waypoint route whenever waypoints change
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const src = m.getSource(WAYPOINT_ROUTE_SOURCE) as mapboxgl.GeoJSONSource;
    if (!src) return;

    if (waypoints.length <= 1) {
      src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
      m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "none");
      setWaypointRouteSummary(null);
      setRouteGeojson(null);
      return;
    }

    const coords = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(";");
    const radiuses = waypoints.map(() => "25").join(";");
    const approaches = waypoints.map(() => "unrestricted").join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&continue_straight=false&radiuses=${radiuses}&approaches=${approaches}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

    let cancelled = false;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.routes?.[0]) {
          const route = data.routes[0];
          src.setData({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
          m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "visible");
          setWaypointRouteSummary({ distance: route.distance, duration: route.duration });
          setRouteGeojson(route.geometry);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [waypoints]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* FAB wrapper */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          zIndex: 10,
        }}
      >
        {/* Add waypoint FAB */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a", background: "rgba(255,255,255,0.88)", borderRadius: 20, padding: "3px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", whiteSpace: "nowrap" }}>
            {addingWaypoint ? "지도를 클릭하세요" : "경유지 추가"}
          </span>
          <button
            onClick={() => setAddingWaypoint((v) => !v)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: addingWaypoint ? "2px solid #3b82f6" : "none",
              background: "#1a1a1a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              {addingWaypoint ? (<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>) : (<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>)}
            </svg>
          </button>
        </div>

        {/* Locate user FAB */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a", background: "rgba(255,255,255,0.88)", borderRadius: 20, padding: "3px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", whiteSpace: "nowrap" }}>
            현재 위치
          </span>
          <button
            onClick={handleLocateUser}
            disabled={locatingUser}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: "none",
              background: "#fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              cursor: locatingUser ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            {locatingUser ? (
              <span style={{ width: 22, height: 22, border: "2.5px solid #e2e8f0", borderTopColor: "#3B82F6", borderRadius: "50%", display: "block", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Route selection panel - top left */}
      {routes.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 10,
          }}
        >
          {routes.map((r, i) => (
            <button
              key={i}
              onClick={() => selectRoute(i)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: selectedIdx === i ? "#fff" : "rgba(255,255,255,0.85)",
                border: selectedIdx === i ? `2px solid ${ROUTE_COLORS[i]}` : "2px solid transparent",
                borderRadius: 10,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                minWidth: 200,
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: ROUTE_COLORS[i],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: selectedIdx === i ? 700 : 400, color: "#1e293b" }}>
                경로 {i + 1}
              </span>
              <span style={{ fontSize: 13, color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>
                {formatDistance(r.distance)} · {formatDuration(r.duration)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Summary bar - bottom center */}
      {waypointRouteSummary && waypoints.length >= 2 && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#fff",
            padding: "10px 12px 10px 28px",
            borderRadius: 40,
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            zIndex: 10,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span>총 {(waypointRouteSummary.distance / 1000).toFixed(1)}km · 약 {formatDuration(waypointRouteSummary.duration)}</span>
          {playing ? (
            <>
              <button
                onClick={togglePause}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none",
                  background: "#f59e0b", color: "#fff", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
                title={paused ? "재개" : "일시정지"}
              >
                {paused ? "▶" : "❚❚"}
              </button>
              <button
                onClick={stopAnimation}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
                title="정지"
              >
                ■
              </button>
            </>
          ) : (
            <button
              onClick={playAnimation}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none",
                background: "#3b82f6", color: "#fff", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
              title="코스 미리보기"
            >
              ▶
            </button>
          )}
        </div>
      )}

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            handleSaveCourse();
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes locPulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>

      {/* Right panel - waypoints + course form */}
      {waypoints.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 60,
            width: 280,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Waypoints list */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              fontWeight: 700,
              fontSize: 14,
              color: "#1e293b",
            }}
          >
            경유지 ({waypoints.length})
          </div>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={reorderWaypoints}>
            <SortableContext items={waypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
              {waypoints.map((wp, i) => (
                <SortableWaypointItem key={wp.id} wp={wp} index={i} isLast={i === waypoints.length - 1} onRemove={removeWaypoint} />
              ))}
            </SortableContext>
          </DndContext>

          {/* Course info form */}
          <div style={{ borderTop: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>코스 정보</div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>코스 이름</label>
              <input
                type="text"
                maxLength={30}
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="예: 한강 야경 드라이브"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 2 }}>{courseTitle.length}/30</div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", marginBottom: 6, display: "block" }}>
                감성 태그 <span style={{ color: "#cbd5e1" }}>({courseTags.length}/3)</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TAG_OPTIONS.map((tag) => {
                  const selected = courseTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        border: selected ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                        background: selected ? "#eff6ff" : "#fff",
                        color: selected ? "#2563eb" : "#64748b",
                        fontSize: 12,
                        fontWeight: selected ? 600 : 400,
                        cursor: !selected && courseTags.length >= 3 ? "not-allowed" : "pointer",
                        opacity: !selected && courseTags.length >= 3 ? 0.4 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>한 줄 소개</label>
              <input
                type="text"
                maxLength={60}
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="이 코스를 한 줄로 소개해주세요"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 2 }}>{courseDesc.length}/60</div>
            </div>

            {/* Music section */}
            <div>
              <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>음악 첨부</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={musicUrl}
                  onChange={(e) => handleMusicUrlChange(e.target.value)}
                  placeholder="YouTube 링크를 붙여넣어 주세요"
                  style={{
                    width: "100%",
                    padding: "8px 32px 8px 10px",
                    border: `1px solid ${musicUrlTouched ? (musicUrlValid ? "#10b981" : "#ef4444") : "#e2e8f0"}`,
                    borderRadius: 8,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                />
                {musicUrlTouched && (
                  <span style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    color: musicUrlValid ? "#10b981" : "#ef4444",
                  }}>
                    {musicUrlValid ? "✓" : "✗"}
                  </span>
                )}
              </div>
              {musicUrlTouched && !musicUrlValid && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>올바른 YouTube 링크를 입력해주세요</div>
              )}

              {musicUrlValid && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Mini player */}
                  <div
                    id="yt-preview-container"
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#000",
                      aspectRatio: "16/9",
                    }}
                  />

                  <div style={{ fontSize: 11, color: "#64748b" }}>재생 구간 (선택)</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, flex: 1 }}>
                      <input type="number" min="0" placeholder="0" value={startMin} onChange={(e) => setStartMin(e.target.value)}
                        style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>분</span>
                      <input type="number" min="0" max="59" placeholder="0" value={startSecInput} onChange={(e) => setStartSecInput(e.target.value)}
                        style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>초</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>~</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, flex: 1 }}>
                      <input type="number" min="0" placeholder="0" value={endMin} onChange={(e) => setEndMin(e.target.value)}
                        style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>분</span>
                      <input type="number" min="0" max="59" placeholder="0" value={endSecInput} onChange={(e) => setEndSecInput(e.target.value)}
                        style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>초</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePreviewPlay}
                    disabled={!previewReadyRef.current && !previewing}
                    style={{
                      width: "100%",
                      padding: "8px 0",
                      borderRadius: 8,
                      border: previewing ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
                      background: previewing ? "#fef2f2" : "#fff",
                      color: previewing ? "#ef4444" : "#3b82f6",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {previewing ? "정지 ■" : "구간 미리듣기 ▶"}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveCourse}
              disabled={saving || !courseTitle.trim() || waypoints.length < 2}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 10,
                border: "none",
                background: saving || !courseTitle.trim() || waypoints.length < 2 ? "#cbd5e1" : "#3b82f6",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving || !courseTitle.trim() || waypoints.length < 2 ? "not-allowed" : "pointer",
                transition: "background 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {saving && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              )}
              {saving ? "저장 중..." : "코스 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
