"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import LoginModal from "./LoginModal";
import Toast from "./Toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
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
import { compressImage } from "@/lib/image-utils";
import { containsBannedWord } from "@/lib/text-filter";
import { checkImagesSafety } from "@/lib/image-check";
import { autoRegionTags as driveAutoRegionTags } from "@/lib/drive-regions";
import CourseCard from "./CourseCard";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

/** Brand color for Mapbox GL paint properties. Mapbox GL JS does not resolve CSS variables (var(--x)) in paint properties — must use literal hex/rgba value. */
const BRAND_COLOR = "#ff385c";

const WAYPOINT_ROUTE_SOURCE = "route-source";
const WAYPOINT_ROUTE_LAYER = "route";
const TAG_OPTIONS = ["야경", "심야", "힐링", "해안", "산길", "드라이브 데이트", "단풍", "새벽", "일출", "지름길", "와인딩", "강변", "맛집", "카페"] as const;
function createProfilePinEl(avatarUrl?: string | null, nickname?: string): HTMLDivElement {
  // Outer: Mapbox positioning (transform-safe)
  const el = document.createElement("div");
  el.style.cssText = "width:36px;height:36px;cursor:pointer;";

  // Inner: animation target (pin-floating class applied here)
  const inner = document.createElement("div");
  inner.className = "pin-inner";
  inner.style.cssText = "width:100%;height:100%;border-radius:50%;border:1px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);overflow:hidden;background:#ddd;";

  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    inner.appendChild(img);
  } else {
    const letter = (nickname || "?").charAt(0).toUpperCase();
    inner.style.cssText += "display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:14px;font-weight:700;";
    inner.textContent = letter;
  }

  el.appendChild(inner);
  return el;
}

function createEndpointMarkerEl(label: string, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `display:flex;flex-direction:column;align-items:center;pointer-events:none;`;
  const badge = document.createElement("div");
  badge.style.cssText = `padding:3px 8px;border-radius:8px;background:${color};color:#fff;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);`;
  badge.textContent = label;
  el.appendChild(badge);
  const arrow = document.createElement("div");
  arrow.style.cssText = `width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};`;
  el.appendChild(arrow);
  return el;
}


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



interface Waypoint {
  id: string;
  lng: number;
  lat: number;
  name: string;
  memo?: string;
  photoUrl?: string;
}

async function reverseGeocode(lng: number, lat: number): Promise<string> {
  try {
    const res = await fetch(`/api/reverse-geocode?lng=${lng}&lat=${lat}`);
    const data = await res.json();
    if (data.name) return data.name;
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

function createNumberedMarkerEl(num: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:28px;height:28px;border-radius:50%;
    background:var(--color-brand);color:#fff;font-weight:700;font-size:13px;
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
  isFirst,
  isLast,
  onRemove,
  onUpdate,
}: {
  wp: Waypoint;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: { memo?: string; photoUrl?: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: wp.id });
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEndpoint = isFirst || isLast;
  const hasContent = !!(wp.memo || wp.photoUrl);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdate(wp.id, { photoUrl: url });
    e.target.value = "";
  };

  const style: React.CSSProperties = {
    borderBottom: isLast ? "none" : "1px solid #f1f5f9",
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "#f1f5f9" : "#fff",
    zIndex: isDragging ? 50 : "auto",
    borderRadius: isDragging ? 8 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 10px 8px" }}>
        <span {...listeners} style={{ cursor: "grab", color: "#6a6a6a", fontSize: 18, lineHeight: 1, padding: "8px 6px", flexShrink: 0, userSelect: "none", touchAction: "none" }}>⠿</span>
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--color-brand)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
        <span style={{ fontSize: 13, color: "#222222", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wp.name}</span>
        {/* + / collapse button (출발·도착지는 사진/메모 불가) */}
        {!isEndpoint && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: 24, height: 24, borderRadius: 6, border: "none",
              background: expanded ? "var(--color-brand-subtle)" : hasContent ? "var(--color-brand-subtle)" : "#F4F4F4",
              color: expanded ? "var(--color-brand)" : hasContent ? "var(--color-brand)" : "#999999",
              fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {expanded ? "−" : "+"}
          </button>
        )}
        <button
          onClick={() => onRemove(wp.id)}
          style={{ width: 24, height: 24, border: "none", background: "transparent", color: "#6a6a6a", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-brand)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
        >✕</button>
      </div>
      {/* Expanded: photo + memo (경유지만) */}
      {expanded && !isEndpoint && (
        <div style={{ padding: "0 12px 10px 48px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          {/* Photo */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
            {wp.photoUrl ? (
              <div style={{ position: "relative", width: 64, height: 64 }}>
                <img src={wp.photoUrl} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
                <button
                  onClick={() => onUpdate(wp.id, { photoUrl: undefined })}
                  style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 64, height: 64, borderRadius: 8, border: "2px dashed #E0E0E0",
                  background: "#FAFAF8", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: 9, color: "#6a6a6a" }}>사진</span>
              </button>
            )}
          </div>
          {/* Memo */}
          <textarea
            rows={2}
            value={wp.memo || ""}
            onChange={(e) => {
              const trimmed = e.target.value.slice(0, 12);
              onUpdate(wp.id, { memo: trimmed });
            }}
            placeholder="메모 (12자)"
            style={{
              width: 90, padding: "6px 8px", border: "1px solid #E0E0E0", borderRadius: 8,
              fontSize: 12, outline: "none", background: "#FAFAF8", boxSizing: "border-box",
              wordBreak: "break-all",
              resize: "none", lineHeight: 1.5, textAlign: "center",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function Map() {
  const { user: authUser } = useAuth();
  const supabase = createClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(new globalThis.Map());

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
  const [previewing, setPreviewing] = useState(false);
  const previewPlayerRef = useRef<any>(null);
  const previewReadyRef = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success"; duration?: number } | null>(null);
  const [addingWaypoint, setAddingWaypoint] = useState(false);
  const addingWaypointRef = useRef(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pendingSaveRef = useRef(false);
  const [autoSaving, setAutoSaving] = useState(() => !!sessionStorage.getItem("create_pending_save"));
  const [navigating, setNavigating] = useState(false);

  const searchParams = useSearchParams();
  const [editId, setEditId] = useState<string | null>(null);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [mode, setMode] = useState<"explore" | "create">("explore");
  const [createStep, setCreateStep] = useState(1); // 1:경유지 2:지역태그 3:감성태그 4:이름+소개 5:사진 6:음악

  // Explore mode states
  const [browseCourses, setBrowseCourses] = useState<{ id: string; title: string; description?: string; tags: string[]; region_tags?: string[]; distance_km: number; like_count: number; user_id: string; waypoints: { lng: number; lat: number; name: string }[]; route_geojson: any; photos?: string[]; created_at?: string; profiles?: { id: string; nickname: string; avatar_url: string } | null }[]>([]);
  const [selectedBrowseCourse, setSelectedBrowseCourse] = useState<typeof browseCourses[number] | null>(null);
  const browsePinsRef = useRef<mapboxgl.Marker[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emptyBubbleDismissed, setEmptyBubbleDismissed] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);
  const [visibleCourseCount, setVisibleCourseCount] = useState(-1); // -1 = not loaded yet
  const browseWaypointCoordsRef = useRef<[number, number][][]>([]);

  // Course search & filter mode (independent toggles)
  const [searchMode, setSearchMode] = useState(false);
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchFromCoord, setSearchFromCoord] = useState<{ lng: number; lat: number } | null>(null);
  const [searchToCoord, setSearchToCoord] = useState<{ lng: number; lat: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState(20); // km
  const [searchTagFilter, setSearchTagFilter] = useState<string[]>([]);
  const [searchFromResults, setSearchFromResults] = useState<any[]>([]);
  const [searchToResults, setSearchToResults] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState<"from" | "to" | null>(null);
  const searchFromDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchToDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const browseEndpointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<{ label: string; course: typeof browseCourses[number] }[]>([]);

  // Load browse courses + featured courses (auth 불필요, 즉시 실행)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, tags, region_tags, distance_km, waypoints, route_geojson, like_count, user_id, photos, created_at, profiles(id, nickname, avatar_url)")
        .eq("visibility", "public")
        .order("like_count", { ascending: false })
        .limit(100);
      if (data) setBrowseCourses(data as any);

      // Featured courses
      const { data: featured } = await supabase
        .from("featured_courses")
        .select("label, sort_order, course_id")
        .order("sort_order", { ascending: true });
      if (featured && data) {
        const mapped = featured.map((f: any) => {
          const course = (data as any[]).find((c: any) => c.id === f.course_id);
          return course ? { label: f.label, course } : null;
        }).filter(Boolean) as any[];
        setFeaturedCourses(mapped);
      }
    })();
  }, []);

  // Responsive: panel layout
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Save progress to sessionStorage (only in create mode)
  useEffect(() => {
    if (mode !== "create" || waypoints.length === 0) return;
    sessionStorage.setItem("create_draft", JSON.stringify({
      waypoints, courseTitle, courseDesc, courseTags, musicUrl, startMin, startSecInput, videoId, createStep, editId, newCourseId, existingPhotoUrls,
    }));
  }, [mode, waypoints, courseTitle, courseDesc, courseTags, musicUrl, startMin, startSecInput, videoId, createStep, editId, newCourseId, existingPhotoUrls]);

  // Restore from sessionStorage on mount (only when returning from login)
  useEffect(() => {
    const saved = sessionStorage.getItem("create_draft");
    const isPendingSave = sessionStorage.getItem("create_pending_save");
    if (!saved || searchParams.get("edit")) return;
    // 로그인 복귀가 아니면 남은 draft 정리
    if (!isPendingSave) { sessionStorage.removeItem("create_draft"); return; }
    try {
      const d = JSON.parse(saved);
      if (d.waypoints?.length > 0) {
        // 맵 로드 대기 후 마커 복원
        const waitForMap = () => {
          const m = map.current;
          if (!m || !m.isStyleLoaded()) { setTimeout(waitForMap, 200); return; }
          // 기존 마커/경유지 초기화 후 한 번에 세팅
          markersRef.current.forEach((mk) => mk.remove());
          markersRef.current.clear();
          const restored: Waypoint[] = [];
          d.waypoints.forEach((wp: any, i: number) => {
            const id = crypto.randomUUID();
            const el = createNumberedMarkerEl(i + 1);
            const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat([wp.lng, wp.lat]).addTo(m);
            marker.on("dragend", () => {
              const lngLat = marker.getLngLat();
              setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, lng: lngLat.lng, lat: lngLat.lat, name: `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}` } : w));
              reverseGeocode(lngLat.lng, lngLat.lat).then((name) => { setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, name } : w)); });
            });
            markersRef.current.set(id, marker);
            restored.push({ id, lng: wp.lng, lat: wp.lat, name: wp.name, memo: wp.memo, photoUrl: wp.photoUrl });
          });
          setWaypoints(restored);
          const bounds = new mapboxgl.LngLatBounds();
          d.waypoints.forEach((wp: any) => bounds.extend([wp.lng, wp.lat]));
          m.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 });
        };
        waitForMap();
      }
      if (d.courseTitle) setCourseTitle(d.courseTitle);
      if (d.courseDesc) setCourseDesc(d.courseDesc);
      if (d.courseTags) setCourseTags(d.courseTags);
      if (d.musicUrl) { setMusicUrl(d.musicUrl); setVideoId(d.videoId || ""); }
      if (d.startMin) setStartMin(d.startMin);
      if (d.startSecInput) setStartSecInput(d.startSecInput);
      if (d.createStep) setCreateStep(d.createStep);
      if (d.editId) setEditId(d.editId);
      if (d.newCourseId) setNewCourseId(d.newCourseId);
      if (d.existingPhotoUrls?.length) { setExistingPhotoUrls(d.existingPhotoUrls); }

      // Enter create mode with restored draft
      browsePinsRef.current.forEach((mk) => mk.remove());
      browsePinsRef.current = [];
      setMode("create");
      setShowSheet(window.innerWidth >= 768);

      // If returning from login, flag for auto-save
      if (sessionStorage.getItem("create_pending_save")) {
        sessionStorage.removeItem("create_pending_save");
        pendingSaveRef.current = true;
      }
    } catch {}
  }, []);

  // Clear draft on successful save
  const clearDraft = () => sessionStorage.removeItem("create_draft");

  // mode가 explore로 바뀌면 draft 정리
  useEffect(() => {
    if (mode === "explore") sessionStorage.removeItem("create_draft");
  }, [mode]);

  // D2 — hide BottomTab during create mode via body class
  useEffect(() => {
    if (mode === "create") {
      document.body.classList.add("create-mode-active");
    } else {
      document.body.classList.remove("create-mode-active");
    }
    return () => document.body.classList.remove("create-mode-active");
  }, [mode]);

  // Pin floating animation — add/remove class on selected course change (target inner div)
  useEffect(() => {
    // Remove float class from all pin inners
    browsePinsRef.current.forEach((mk) => {
      const inner = mk.getElement().querySelector(".pin-inner");
      inner?.classList.remove("pin-floating");
    });
    // Add to currently selected pin's inner
    if (selectedBrowseCourse) {
      const target = browsePinsRef.current.find(
        (mk) => (mk.getElement() as HTMLDivElement).dataset.courseId === selectedBrowseCourse.id
      );
      const inner = target?.getElement().querySelector(".pin-inner");
      inner?.classList.add("pin-floating");
    }
  }, [selectedBrowseCourse]);

  // fitBounds / easeTo — reframe viewport so selected route is visible above popup card
  useEffect(() => {
    if (!map.current) return;
    if (selectedBrowseCourse) {
      const coords: [number, number][] | undefined =
        selectedBrowseCourse.route_geojson?.coordinates;
      if (coords && coords.length >= 2) {
        // Compute bounding box from route LineString coordinates
        const bounds = coords.reduce(
          (b: mapboxgl.LngLatBounds, c: [number, number]) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, {
          padding: { top: 120, bottom: 331, left: 60, right: 60 },
          duration: 300,
          maxZoom: 14, // prevent over-zoom on very short routes
        });
      } else if (selectedBrowseCourse.waypoints?.[0]) {
        // Fallback: no route geometry — just center on first waypoint
        map.current.easeTo({
          center: [
            selectedBrowseCourse.waypoints[0].lng,
            selectedBrowseCourse.waypoints[0].lat,
          ],
          padding: { top: 120, bottom: 331, left: 60, right: 60 },
          duration: 300,
        });
      } else {
        // No geometry at all — at least apply padding shift
        map.current.easeTo({
          padding: { top: 120, bottom: 331, left: 60, right: 60 },
          duration: 300,
        });
      }
    } else {
      // Restore default bottom padding when card is dismissed
      map.current.easeTo({
        padding: { top: 120, bottom: 200, left: 60, right: 60 },
        duration: 300,
      });
    }
  }, [selectedBrowseCourse]);

  // Load existing course data for edit mode
  useEffect(() => {
    const eid = searchParams.get("edit");
    if (!eid) return;
    setEditId(eid);
    // Enter create mode for editing
    browsePinsRef.current.forEach((mk) => mk.remove());
    browsePinsRef.current = [];
    setMode("create");
    setShowSheet(true);
    (async () => {
      const { data: course } = await supabase
        .from("courses")
        .select("*")
        .eq("id", eid)
        .single();
      if (!course) return;

      // 원본 데이터 백업 (나가기 시 복원용)
      sessionStorage.setItem("edit_original", JSON.stringify(course));

      setCourseTitle(course.title || "");
      setCourseDesc(course.description || "");
      setCourseTags(course.tags || []);

      // Music
      const m = course.music as { videoId: string; startSec: number; endSec: number | null } | null;
      if (m?.videoId) {
        const ytUrl = `https://www.youtube.com/watch?v=${m.videoId}`;
        setMusicUrl(ytUrl);
        setVideoId(m.videoId);
        const sec = m.startSec || 0;
        setStartMin(String(Math.floor(sec / 60)));
        setStartSecInput(String(sec % 60));
      }

      // Waypoints — clear existing then add after map is ready
      const wps = course.waypoints as { lng: number; lat: number; name: string; memo?: string; photoUrl?: string }[];
      if (wps?.length) {
        const waitForMap = () => {
          const mp = map.current;
          if (!mp || !mp.isStyleLoaded()) {
            setTimeout(waitForMap, 200);
            return;
          }
          // Clear existing markers/waypoints first, then set all at once
          markersRef.current.forEach((mk) => mk.remove());
          markersRef.current.clear();
          const restored: Waypoint[] = [];
          wps.forEach((wp, i) => {
            const id = crypto.randomUUID();
            const el = createNumberedMarkerEl(i + 1);
            const marker = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat([wp.lng, wp.lat]).addTo(mp);
            marker.on("dragend", () => {
              const lngLat = marker.getLngLat();
              setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, lng: lngLat.lng, lat: lngLat.lat, name: `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}` } : w));
              reverseGeocode(lngLat.lng, lngLat.lat).then((name) => { setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, name } : w)); });
            });
            markersRef.current.set(id, marker);
            restored.push({ id, lng: wp.lng, lat: wp.lat, name: wp.name, memo: wp.memo, photoUrl: wp.photoUrl });
          });
          setWaypoints(restored);
          // Fit map to waypoints
          const bounds = new mapboxgl.LngLatBounds();
          wps.forEach((wp) => bounds.extend([wp.lng, wp.lat]));
          mp.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 });
        };
        waitForMap();
      // Photos
      const photos = course.photos as string[] | null;
      if (photos?.length) { setExistingPhotoUrls(photos); }
      }
    })();
  }, [searchParams]);

  // Handle ?course= parameter — auto-select course on map
  const courseParamHandled = useRef(false);
  useEffect(() => {
    const courseId = searchParams.get("course");
    const lng = searchParams.get("lng");
    const lat = searchParams.get("lat");
    if (!courseId || courseParamHandled.current) return;

    const waitForCourses = () => {
      if (browseCourses.length === 0) { setTimeout(waitForCourses, 300); return; }
      courseParamHandled.current = true;
      window.history.replaceState(null, "", "/map");
      const found = browseCourses.find((c) => c.id === courseId);
      if (found) {
        setSelectedBrowseCourse(found);
        const m = map.current;
        if (m) {
          if (found.route_geojson) {
            if (m.getLayer("browse-route")) m.removeLayer("browse-route");
            if (m.getSource("browse-route")) m.removeSource("browse-route");
            m.addSource("browse-route", { type: "geojson", data: found.route_geojson });
            m.addLayer({ id: "browse-route", type: "line", source: "browse-route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": BRAND_COLOR, "line-width": 4, "line-opacity": 0.8 } });
          }
          const fwps = found.waypoints;
          if (fwps.length >= 2) {
            browseEndpointMarkersRef.current.forEach((mk) => mk.remove());
            browseEndpointMarkersRef.current = [];
            const startEl = createEndpointMarkerEl("출발", "#10b981");
            const endEl = createEndpointMarkerEl("도착", "var(--color-brand)");
            browseEndpointMarkersRef.current.push(
              new mapboxgl.Marker({ element: startEl, anchor: "bottom" }).setLngLat([fwps[0].lng, fwps[0].lat]).addTo(m),
              new mapboxgl.Marker({ element: endEl, anchor: "bottom" }).setLngLat([fwps[fwps.length - 1].lng, fwps[fwps.length - 1].lat]).addTo(m),
            );
          }
          const bounds = new mapboxgl.LngLatBounds();
          found.waypoints.forEach((wp) => bounds.extend([wp.lng, wp.lat]));
          m.fitBounds(bounds, { padding: { top: 120, bottom: 200, left: 60, right: 60 }, maxZoom: 14, duration: 800 });
        }
      } else if (lng && lat && map.current) {
        map.current.flyTo({ center: [parseFloat(lng), parseFloat(lat)], zoom: 13, duration: 800 });
      }
    };
    waitForCourses();
  }, [searchParams, browseCourses]);

  const handleMusicUrlChange = useCallback((url: string) => {
    setMusicUrl(url);
    const id = extractVideoId(url);
    setVideoId(id ?? "");
  }, []);

  const musicStartSec = (parseInt(startMin || "0") * 60) + parseInt(startSecInput || "0");
  const musicEndSec = musicStartSec + 45;
  const musicUrlTouched = musicUrl.length > 0;
  const musicUrlValid = isValidYoutubeUrl(musicUrl);

  // Course title validation: 2+ complete Korean syllables or letters (not jamo-only)
  const COMPLETE_CHARS = courseTitle.trim().replace(/[ㄱ-ㅎㅏ-ㅣ\s]/g, "");
  const titleValid = COMPLETE_CHARS.length >= 2;

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
    if (saving) return;
    try {
      // authUser가 아직 로딩 안 됐을 수 있으므로 직접 세션 확인
      let currentUser = authUser;
      if (!currentUser) {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user ?? null;
      }

      if (!titleValid) {
        setToast({ message: "코스 이름을 2글자 이상 입력해주세요 (자음만 불가)", type: "error" });
        return;
      }
      // 코스 개수 제한 (인당 10개, 수정/관리자 제외)
      if (!editId && currentUser) {
        const { data: profileData } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single();
        if (profileData?.role !== "admin") {
          const { count } = await supabase.from("courses").select("id", { count: "exact", head: true }).eq("user_id", currentUser.id);
          if ((count ?? 0) >= 10) {
            setToast({ message: "코스는 최대 10개까지 만들 수 있어요", type: "error" });
            return;
          }
        }
      }

      const titleBan = containsBannedWord(courseTitle);
      if (titleBan) { setToast({ message: "코스 이름에 부적절한 표현이 포함돼 있어요", type: "error" }); return; }
      const descBan = containsBannedWord(courseDesc);
      if (descBan) { setToast({ message: "코스 소개에 부적절한 표현이 포함돼 있어요", type: "error" }); return; }
      for (const wp of waypoints) {
        if (containsBannedWord(wp.name)) { setToast({ message: `경유지 "${wp.name}"에 부적절한 표현이 포함돼 있어요`, type: "error" }); return; }
      }
      if (photoFiles.length > 0) {
        setSaving(true);
        setToast({ message: "사진을 검사하고 있어요...", type: "success" });
        const unsafeIndices = await checkImagesSafety(photoFiles);
        if (unsafeIndices.length > 0) {
          setPhotoFiles((prev) => prev.filter((_, i) => !unsafeIndices.includes(i)));

          setSaving(false);
          setToast({ message: `부적절한 사진 ${unsafeIndices.length}장이 제거됐어요. 다시 저장해주세요`, type: "error" });
          return;
        }
      }
      if (courseTags.length === 0) {
        setToast({ message: "감성 태그를 1개 이상 선택해주세요", type: "error" });
        return;
      }
      if (!currentUser) {
        sessionStorage.setItem("create_pending_save", "true");
        window.location.href = `/login?redirect=${encodeURIComponent("/map")}`;
        return;
      }

      setSaving(true);

      let uploadedPhotoUrls: string[] = [...existingPhotoUrls];
      if (photoFiles.length > 0) {
        const userId = currentUser.id;
        const courseId = editId || crypto.randomUUID();
        for (let i = 0; i < photoFiles.length; i++) {
          try {
            const compressed = await compressImage(photoFiles[i]);
            const path = `${userId}/${courseId}/${Date.now()}_${i}.jpg`;
            const { error } = await supabase.storage.from("course-photos").upload(path, compressed, { upsert: true });
            if (error) continue;
            const { data: { publicUrl } } = supabase.storage.from("course-photos").getPublicUrl(path);
            uploadedPhotoUrls.push(publicUrl);
          } catch {}
        }
      }

      const generatedRegionTags = driveAutoRegionTags(waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })));
      const region = generatedRegionTags.join("-");

      const userId = currentUser.id;
      const courseIdForUpload = editId || crypto.randomUUID();
      const uploadedWaypoints = await Promise.all(waypoints.map(async (wp) => {
        if (!wp.photoUrl || !wp.photoUrl.startsWith("blob:")) {
          return { lng: wp.lng, lat: wp.lat, name: wp.name, memo: wp.memo, photoUrl: wp.photoUrl };
        }
        try {
          const res = await fetch(wp.photoUrl);
          const blob = await res.blob();
          const path = `${userId}/${courseIdForUpload}/wp_${wp.id}_${Date.now()}.jpg`;
          const { error } = await supabase.storage.from("course-photos").upload(path, blob, { upsert: true });
          if (error) return { lng: wp.lng, lat: wp.lat, name: wp.name, memo: wp.memo, photoUrl: wp.photoUrl };
          const { data: { publicUrl } } = supabase.storage.from("course-photos").getPublicUrl(path);
          return { lng: wp.lng, lat: wp.lat, name: wp.name, memo: wp.memo, photoUrl: publicUrl };
        } catch {
          return { lng: wp.lng, lat: wp.lat, name: wp.name, memo: wp.memo, photoUrl: wp.photoUrl };
        }
      }));

      const courseData = {
        title: courseTitle,
        description: courseDesc,
        tags: courseTags,
        waypoints: uploadedWaypoints,
        route_geojson: routeGeojson,
        distance_km: waypointRouteSummary ? +(waypointRouteSummary.distance / 1000).toFixed(1) : 0,
        duration_min: waypointRouteSummary ? Math.round(waypointRouteSummary.duration / 60) : 0,
        music: videoId ? { videoId, startSec: musicStartSec, endSec: (musicEndSec || 0) + 2 } : null,
        region,
        region_tags: generatedRegionTags,
        visibility: "draft",
        photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : [],
      };

      let resultId: string;

      if (editId) {
        const { error } = await supabase.from("courses").update(courseData).eq("id", editId);
        if (error) { setSaving(false); setToast({ message: `수정 실패: ${error.message}`, type: "error" }); return; }
        resultId = editId;
      } else {
        const { data, error } = await supabase.from("courses").insert({ ...courseData, user_id: currentUser.id }).select("id").single();
        if (error || !data) {
          setSaving(false);
          const msg = error?.message?.includes("COURSE_LIMIT_EXCEEDED")
            ? "코스는 최대 10개까지 만들 수 있어요"
            : error?.message?.includes("BANNED_WORD")
            ? "코스 이름 또는 소개에 부적절한 표현이 포함돼 있어요"
            : `저장 실패: ${error?.message}`;
          setToast({ message: msg, type: "error" });
          return;
        }
        resultId = data.id;
        setNewCourseId(data.id);
      }

      setSaving(false);
      clearDraft();
      if (editId) sessionStorage.setItem("preview_is_edit", "true");
      else sessionStorage.removeItem("preview_is_edit");
      window.location.href = `/course/${resultId}/preview`;
    } catch (err) {
      console.error("[SAVE] CRASH:", err);
      setSaving(false);
      setToast({ message: "저장 중 오류가 발생했어요", type: "error" });
    }
  }, [courseTitle, courseTags, courseDesc, waypoints, waypointRouteSummary, routeGeojson, videoId, musicStartSec, musicEndSec, editId, authUser, photoFiles, existingPhotoUrls, titleValid, clearDraft, saving]);

  // 로그인 후 복귀 시 자동 저장 (경로 데이터 로딩 완료 후)
  useEffect(() => {
    if (pendingSaveRef.current && waypoints.length >= 2 && titleValid && routeGeojson && waypointRouteSummary) {
      pendingSaveRef.current = false;
      setAutoSaving(true);
      handleSaveCourse();
    }
  }, [handleSaveCourse, waypoints, titleValid, routeGeojson, waypointRouteSummary]);

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
    if (locatingUser) return; // 중복 요청 방지
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const m = map.current;
        if (!m) return;
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        sessionStorage.setItem("last_user_pos", JSON.stringify({ lng, lat }));

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
      (err) => {
        // 첫 시도 실패 시 enableHighAccuracy: true로 재시도
        if (err.code !== 1) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocatingUser(false);
              const lng = pos.coords.longitude;
              const lat = pos.coords.latitude;
              if (userLocationMarkerRef.current) userLocationMarkerRef.current.remove();
              const el = document.createElement("div");
              el.style.cssText = "position:relative;width:28px;height:28px;";
              el.innerHTML = `
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.2);animation:locPulse 2s ease-out infinite;"></div>
                <div style="position:absolute;top:7px;left:7px;width:14px;height:14px;border-radius:50%;background:#3B82F6;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
              `;
              const m = map.current;
              if (m) {
                userLocationMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
                m.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 });
              }
            },
            () => {
              setLocatingUser(false);
              setToast({ message: "위치를 가져올 수 없어요. 위치 서비스를 확인해주세요", type: "error" });
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
          return;
        }
        setLocatingUser(false);
        setToast({ message: "위치 권한을 허용해주세요", type: "error" });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const addWaypoint = useCallback((lng: number, lat: number, placeName?: string) => {
    const m = map.current;
    if (!m) return;
    if (markersRef.current.size >= 7) { setToast({ message: "경유지는 최대 7개까지 추가할 수 있어요", type: "error" }); return; }

    // 첫 경유지 추가 시 도로 위 안내 토스트 (1회만)
    if (markersRef.current.size === 0 && !localStorage.getItem("routebook_road_tip_shown")) {
      localStorage.setItem("routebook_road_tip_shown", "1");
      setToast({ message: "도로 위에 정확히 찍으면 더 정확한 경로가 나와요", type: "success", duration: 3000 });
    }

    const id = crypto.randomUUID();
    const num = waypointsRef.current.length + 1;
    const el = createNumberedMarkerEl(num);
    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(m);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, lng: lngLat.lng, lat: lngLat.lat, name: `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}` } : w));
      reverseGeocode(lngLat.lng, lngLat.lat).then((name) => {
        setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, name } : w));
      });
    });

    markersRef.current.set(id, marker);

    // 검색으로 추가: 장소 이름 사용, 직접 클릭: 역지오코딩 (동/읍/면)
    const wp: Waypoint = { id, lng, lat, name: placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    setWaypoints((prev) => [...prev, wp]);

    if (!placeName) {
      reverseGeocode(lng, lat).then((name) => {
        setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
      });
    }

    // 첫 번째 경유지 추가 시에만 바텀시트(사이드패널) 열기
    if (waypointsRef.current.length === 0) {
      setShowSheet(true);
      if (window.innerWidth >= 768) {
        m.easeTo({ center: [lng, lat], padding: { right: 360 }, duration: 300 });
      }
    }
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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } })
  );

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Mark app as visited (for external vs internal detection)
    sessionStorage.setItem("routebook_app", "1");

    // Restore saved map state (from course detail back navigation or last known position)
    const savedState = sessionStorage.getItem("map_state");
    const lastPos = sessionStorage.getItem("last_user_pos");
    let initCenter: [number, number] = [126.978, 37.5665];
    let initZoom = 11;
    if (savedState) {
      try {
        const s = JSON.parse(savedState);
        if (s.lng && s.lat) { initCenter = [s.lng, s.lat]; initZoom = s.zoom || 13; }
      } catch {}
    } else if (lastPos) {
      try {
        const p = JSON.parse(lastPos);
        if (p.lng && p.lat) { initCenter = [p.lng, p.lat]; initZoom = 13; }
      } catch {}
    }

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      language: "ko",
      center: initCenter,
      zoom: initZoom,
      maxTileCacheSize: 100,
    });
    map.current = m;

    // No default compass — custom one rendered in JSX

    // 현재 위치로 이동 (saved state나 ?course= 파라미터 없을 때만)
    const hasCourseParam = new URLSearchParams(window.location.search).has("course");
    if (!savedState && !hasCourseParam && !lastPos && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos.coords.longitude, lat = pos.coords.latitude;
          sessionStorage.setItem("last_user_pos", JSON.stringify({ lng, lat }));
          if (map.current) map.current.flyTo({ center: [lng, lat], zoom: 13, duration: 0 });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }

    m.on("load", () => {
      // Hide road labels + 지형 음영/등고선
      m.getStyle().layers.forEach((layer: any) => {
        if (layer.id.includes("road") && layer.id.includes("label")) {
          m.setLayoutProperty(layer.id, "visibility", "none");
        }
        if (layer.type === "hillshade" || layer.id.includes("hillshade") || layer.id.includes("contour") || layer.id.includes("land-structure")) {
          m.setLayoutProperty(layer.id, "visibility", "none");
        }
      });

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
        paint: { "line-color": BRAND_COLOR, "line-width": 4 },
      });

    });

    m.on("moveend", () => {
      const b = m.getBounds();
      if (!b || browseWaypointCoordsRef.current.length === 0) return;
      const count = browseWaypointCoordsRef.current.filter((wps) => wps.some(([lng, lat]) => b.contains([lng, lat]))).length;
      setVisibleCourseCount(count);
    });

    m.on("click", (e) => {
      if (addingWaypointRef.current) {
        addWaypoint(e.lngLat.lng, e.lngLat.lat);
      }
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, [addWaypoint]);

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

    const coords = waypoints.map((wp) => `${Math.round(wp.lng * 10000) / 10000},${Math.round(wp.lat * 10000) / 10000}`).join(";");
    const radiuses = waypoints.map(() => "unlimited").join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=geojson&overview=full&continue_straight=true&radiuses=${radiuses}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

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

  // Draw browse course pins
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    // Clear existing browse pins
    browsePinsRef.current.forEach((mk) => mk.remove());
    browsePinsRef.current = [];

    if (mode !== "explore" || browseCourses.length === 0) {
      if (m.isStyleLoaded()) {
        if (m.getLayer("browse-routes-all")) m.removeLayer("browse-routes-all");
        if (m.getSource("browse-routes-all")) m.removeSource("browse-routes-all");
      }
      return;
    }

    // 스타일 로딩 완료 대기
    if (!m.isStyleLoaded()) {
      const retry = setTimeout(() => setBrowseCourses((prev) => [...prev]), 500);
      return () => clearTimeout(retry);
    }

    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const filtered = browseCourses.filter((c) => {
      if (searchTagFilter.length > 0 && !searchTagFilter.every((t) => c.tags.includes(t))) return false;
      // 출발/도착 좌표 기반 실시간 필터
      if (searchFromCoord || searchToCoord) {
        const wps = c.waypoints;
        if (!wps || wps.length < 2) return false;
        if (searchFromCoord && haversine(searchFromCoord.lat, searchFromCoord.lng, wps[0].lat, wps[0].lng) > searchRadius) return false;
        if (searchToCoord && haversine(searchToCoord.lat, searchToCoord.lng, wps[wps.length - 1].lat, wps[wps.length - 1].lng) > searchRadius) return false;
      }
      return true;
    });

    // 전체 코스 경로 표시 (검은색)
    if (m.getLayer("browse-routes-all")) m.removeLayer("browse-routes-all");
    if (m.getSource("browse-routes-all")) m.removeSource("browse-routes-all");
    const allRouteFeatures = filtered
      .filter((c) => c.route_geojson?.coordinates?.length >= 2)
      .map((c) => ({ type: "Feature" as const, properties: {}, geometry: c.route_geojson }));
    if (allRouteFeatures.length > 0) {
      m.addSource("browse-routes-all", {
        type: "geojson",
        data: { type: "FeatureCollection", features: allRouteFeatures },
      });
      m.addLayer({
        id: "browse-routes-all",
        type: "line",
        source: "browse-routes-all",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#222222", "line-width": 3, "line-opacity": 0.3 },
      });
    }

    // 핀 좌표 저장 (뷰포트 체크용)
    browseWaypointCoordsRef.current = filtered.map((course) =>
      course.waypoints.map((wp) => [wp.lng, wp.lat] as [number, number])
    );

    // 뷰포트 안에 있는 핀 수 계산
    const bounds = m.getBounds();
    const inView = bounds ? browseWaypointCoordsRef.current.filter((wps) => wps.some(([lng, lat]) => bounds.contains([lng, lat]))).length : filtered.length;
    setVisibleCourseCount(inView);

    filtered.forEach((course) => {
      const wps = course.waypoints;
      if (!wps || wps.length === 0) return;
      // 경로의 중간 지점 사용 (출발-도착 사이 경로 위)
      let center: { lng: number; lat: number };
      const coords = course.route_geojson?.coordinates;
      if (coords && coords.length >= 2) {
        const mid = coords[Math.floor(coords.length / 2)];
        center = { lng: mid[0], lat: mid[1] };
      } else {
        const midIdx = Math.floor(wps.length / 2);
        center = wps[midIdx];
      }

      const el = createProfilePinEl(course.profiles?.avatar_url, course.profiles?.nickname);
      el.dataset.courseId = course.id;

      el.addEventListener("click", () => {
        setSelectedBrowseCourse(course);
        // Clear previous
        browseEndpointMarkersRef.current.forEach((mk) => mk.remove());
        browseEndpointMarkersRef.current = [];
        if (m.getLayer("browse-route")) m.removeLayer("browse-route");
        if (m.getSource("browse-route")) m.removeSource("browse-route");
        // Show route
        if (course.route_geojson) {
          m.addSource("browse-route", { type: "geojson", data: course.route_geojson });
          m.addLayer({ id: "browse-route", type: "line", source: "browse-route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": BRAND_COLOR, "line-width": 4, "line-opacity": 0.8 } });
        }
        // Show start/end markers
        const cwps = course.waypoints;
        if (cwps.length >= 2) {
          const startEl = createEndpointMarkerEl("출발", "#10b981");
          const endEl = createEndpointMarkerEl("도착", "var(--color-brand)");
          const startMk = new mapboxgl.Marker({ element: startEl, anchor: "bottom" }).setLngLat([cwps[0].lng, cwps[0].lat]).addTo(m);
          const endMk = new mapboxgl.Marker({ element: endEl, anchor: "bottom" }).setLngLat([cwps[cwps.length - 1].lng, cwps[cwps.length - 1].lat]).addTo(m);
          browseEndpointMarkersRef.current.push(startMk, endMk);
          const bounds = new mapboxgl.LngLatBounds();
          cwps.forEach((wp) => bounds.extend([wp.lng, wp.lat]));
          m.fitBounds(bounds, { padding: { top: 120, bottom: 200, left: 60, right: 60 }, maxZoom: 14, duration: 800 });
        }
      });

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([center.lng, center.lat]).addTo(m);
      browsePinsRef.current.push(marker);
    });

    // Restore selected course from saved state
    const saved = sessionStorage.getItem("map_state");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.courseId) {
          const found = browseCourses.find((c) => c.id === s.courseId);
          if (found) {
            setSelectedBrowseCourse(found);
            if (found.route_geojson) {
              if (m.getLayer("browse-route")) m.removeLayer("browse-route");
              if (m.getSource("browse-route")) m.removeSource("browse-route");
              m.addSource("browse-route", { type: "geojson", data: found.route_geojson });
              m.addLayer({ id: "browse-route", type: "line", source: "browse-route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": BRAND_COLOR, "line-width": 4, "line-opacity": 0.8 } });
            }
            const fwps = found.waypoints;
            if (fwps && fwps.length >= 2) {
              browseEndpointMarkersRef.current.forEach((mk) => mk.remove());
              browseEndpointMarkersRef.current = [];
              const startEl = createEndpointMarkerEl("출발", "#10b981");
              const endEl = createEndpointMarkerEl("도착", "var(--color-brand)");
              browseEndpointMarkersRef.current.push(
                new mapboxgl.Marker({ element: startEl, anchor: "bottom" }).setLngLat([fwps[0].lng, fwps[0].lat]).addTo(m),
                new mapboxgl.Marker({ element: endEl, anchor: "bottom" }).setLngLat([fwps[fwps.length - 1].lng, fwps[fwps.length - 1].lat]).addTo(m),
              );
            }
          }
        }
      } catch {}
      sessionStorage.removeItem("map_state");
    }
  }, [browseCourses, mode, authUser, searchTagFilter, searchFromCoord, searchToCoord, searchRadius]);

  const clearBrowseRoute = useCallback(() => {
    setSelectedBrowseCourse(null);
    browseEndpointMarkersRef.current.forEach((mk) => mk.remove());
    browseEndpointMarkersRef.current = [];
    const m = map.current;
    if (!m) return;
    if (m.getLayer("browse-route")) m.removeLayer("browse-route");
    if (m.getSource("browse-route")) m.removeSource("browse-route");
  }, []);

  const cancelCreate = useCallback(async () => {
    let u = authUser;
    if (!u) {
      const { data: { session } } = await supabase.auth.getSession();
      u = session?.user ?? null;
    }
    if (u) {
      if (editId) {
        // 수정 모드: 원본 데이터 복원
        const originalStr = sessionStorage.getItem("edit_original");
        if (originalStr) {
          try {
            const original = JSON.parse(originalStr);
            await supabase.from("courses").update({
              title: original.title,
              description: original.description,
              tags: original.tags,
              waypoints: original.waypoints,
              route_geojson: original.route_geojson,
              distance_km: original.distance_km,
              duration_min: original.duration_min,
              music: original.music,
              region: original.region,
              region_tags: original.region_tags,
              visibility: original.visibility === "public" ? "public" : "draft",
              photos: original.photos,
            }).eq("id", editId).eq("user_id", u.id);
          } catch {}
        }
        sessionStorage.removeItem("edit_original");
        sessionStorage.removeItem("preview_is_edit");
      } else if (newCourseId) {
        await supabase.from("courses").delete().eq("id", newCourseId).eq("user_id", u.id);
      }
    }
    // mode를 먼저 explore로 전환해서 draft 저장 방지
    setMode("explore");
    clearDraft();
    // Clear all creation state
    waypoints.forEach((wp) => { markersRef.current.get(wp.id)?.remove(); markersRef.current.delete(wp.id); });
    setWaypoints([]);
    setWaypointRouteSummary(null);
    setRouteGeojson(null);
    setCourseTitle("");
    setCourseDesc("");
    setCourseTags([]);
    setMusicUrl("");
    setVideoId("");
    setStartMin("");
    setStartSecInput("");
    setPhotoFiles([]);
    setExistingPhotoUrls([]);
    setCreateStep(1);
    setEditId(null);
    setNewCourseId(null);
    setShowSheet(false);
    setAddingWaypoint(false);
    setSelectedPlace(null);
    setSearchQuery("");
    setSearchResults([]);
    if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
    // Clear route layer
    const m = map.current;
    if (m) {
      const src = m.getSource(WAYPOINT_ROUTE_SOURCE) as mapboxgl.GeoJSONSource;
      if (src) src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
      m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "none");
    }
    // URL에서 edit/course 파라미터 제거
    window.history.replaceState(null, "", "/map");
  }, [editId, newCourseId, authUser, waypoints, clearDraft]);

  const startCreate = useCallback(() => {
    clearBrowseRoute();
    browsePinsRef.current.forEach((mk) => mk.remove());
    browsePinsRef.current = [];
    setMode("create");
    setAddingWaypoint(true);
    // Mobile: start with mini bar, Desktop: show side panel
    setShowSheet(window.innerWidth >= 768);
  }, [clearBrowseRoute]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {(autoSaving || navigating) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "var(--color-brand)", borderRadius: "50%", display: "block", animation: "spin 0.6s linear infinite" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "#222222" }}>{autoSaving ? "코스를 저장하고 있어요..." : "코스를 불러오고 있어요..."}</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Menu button — top left */}
      {mode === "explore" && (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            position: "absolute", top: 16, left: 16, zIndex: 12,
            width: 40, height: 40, borderRadius: 12,
            background: "#ffffff",
            border: "none", boxShadow: "var(--shadow-card)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Menu overlay */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.3)" }} />
          <div style={{
            position: "fixed", top: 60, left: 16, zIndex: 101,
            background: "#ffffff", borderRadius: 14, padding: "8px 0",
            boxShadow: "var(--shadow-card)", minWidth: 180,
          }}>
            <div
              onClick={() => {
                setSearchMode(true); clearBrowseRoute(); setMenuOpen(false);
                // 현재 위치를 기본 출발지로 설정
                if (!searchFromCoord && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const lng = pos.coords.longitude;
                      const lat = pos.coords.latitude;
                      setSearchFromCoord({ lng, lat });
                      const name = await reverseGeocode(lng, lat);
                      setSearchFrom(name);
                    },
                    () => {},
                    { enableHighAccuracy: false, timeout: 5000 }
                  );
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                fontSize: 14, fontWeight: 500, color: "#222222",
              }}
            >
              <span style={{ fontSize: 16 }}>🔎</span>
              코스 탐색
            </div>
            <div
              onClick={async () => {
                setMenuOpen(false);
                let u = authUser;
                if (!u) {
                  const { data: { session } } = await supabase.auth.getSession();
                  u = session?.user ?? null;
                }
                setMode("explore");
                window.location.href = u ? "/settings" : `/login?redirect=${encodeURIComponent("/settings")}`;
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                fontSize: 14, fontWeight: 500, color: "#222222",
              }}
            >
              <span style={{ fontSize: 16 }}>⚙️</span>
              설정
            </div>
          </div>
        </>
      )}

      {/* Search bar — top center */}
      <div style={{
        position: "absolute", top: 16, left: mode === "explore" ? 68 : 16,
        right: !isMobile && mode === "create" ? 396 : 16, zIndex: 10,
        transition: "right 0.3s, left 0.2s",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
          borderRadius: 12, padding: "8px 12px",
          boxShadow: "var(--shadow-control)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              const v = e.target.value;
              setSearchQuery(v);
              if (searchDebounce.current) clearTimeout(searchDebounce.current);
              if (v.trim().length < 2) { setSearchResults([]); return; }
              searchDebounce.current = setTimeout(async () => {
                const m = map.current;
                const params = new URLSearchParams({ q: v });
                if (m) { const c = m.getCenter(); params.set("lng", String(c.lng)); params.set("lat", String(c.lat)); }
                const res = await fetch(`/api/search?${params}`);
                const data = await res.json();
                setSearchResults(data.documents || []);
              }, 300);
            }}
            placeholder="장소 검색 (맛집, 명소, 카페...)"
            style={{ flex: 1, minWidth: 0, fontSize: 14, background: "transparent", border: "none", outline: "none", color: "#222222" }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); setSelectedPlace(null); if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; } }}
              style={{ width: 20, height: 20, borderRadius: "50%", border: "none", background: "#cbd5e1", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}
            >✕</button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <div onClick={() => setSearchOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1 }} />
        )}
        {searchOpen && searchResults.length > 0 && (
          <div style={{
            marginTop: 4, background: "#ffffff", borderRadius: 12,
            boxShadow: "var(--shadow-card)", overflow: "hidden", maxHeight: 300, overflowY: "auto",
          }}>
            {searchResults.map((place: any, i: number) => (
              <div
                key={i}
                onClick={() => {
                  const lng = parseFloat(place.x);
                  const lat = parseFloat(place.y);
                  setSelectedPlace({ name: place.place_name, category: place.category_group_name, address: place.road_address_name || place.address_name, lng, lat });
                  setSearchResults([]);
                  setSearchOpen(false);
                  if (tempMarkerRef.current) tempMarkerRef.current.remove();
                  const el = document.createElement("div");
                  el.style.cssText = "width:32px;height:32px;";
                  el.innerHTML = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="#ff385c" stroke="#fff" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="#fff"/></svg>`;
                  const m = map.current;
                  if (m) {
                    tempMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
                    m.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
                  }
                }}
                style={{
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: i < searchResults.length - 1 ? "0.5px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#222222" }}>{place.place_name}</div>
                <div style={{ fontSize: 11, color: "#6a6a6a", marginTop: 2 }}>
                  {place.category_group_name && <span style={{ color: "var(--color-brand)", marginRight: 6 }}>{place.category_group_name}</span>}
                  {place.road_address_name || place.address_name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search filter mini bar */}
      {mode === "explore" && !searchMode && (searchFromCoord || searchToCoord || searchTagFilter.length > 0) && (
        <div
          onClick={() => setSearchMode(true)}
          style={{
            position: "absolute", top: 62, left: 16, right: 16, zIndex: 13,
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.01)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            borderRadius: 12, padding: "8px 12px",
            boxShadow: "var(--shadow-card)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-brand)", flexShrink: 0 }}>필터</span>
          <div style={{ flex: 1, fontSize: 12, color: "#222222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {searchFrom && searchTo ? `${searchFrom} → ${searchTo}` : searchFrom || searchTo || ""}
            {(searchFromCoord || searchToCoord) && ` ${searchRadius}km 근방`}
            {searchTagFilter.length > 0 && `${searchFrom || searchTo || searchFromCoord || searchToCoord ? " · " : ""}${searchTagFilter.join(", ")}`}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSearchFrom(""); setSearchTo("");
              setSearchFromCoord(null); setSearchToCoord(null);
              setSearchTagFilter([]);
              setSearchFromResults([]); setSearchToResults([]);
              setSearchRadius(20);
            }}
            style={{
              padding: "3px 10px", borderRadius: 8, border: "1px solid #c1c1c1",
              background: "#fff", cursor: "pointer", flexShrink: 0,
              fontSize: 10, fontWeight: 500, color: "#6a6a6a",
            }}
          >
            초기화
          </button>
        </div>
      )}

      {/* Featured courses chips */}
      {mode === "explore" && featuredCourses.length > 0 && !searchMode && (
        <div style={{
          position: "absolute", top: (searchFromCoord || searchToCoord || searchTagFilter.length > 0) && !searchMode ? 105 : 62, left: 0, right: 0, zIndex: 9,
          transition: "top 0.2s ease",
          overflowX: "auto", overflowY: "visible", whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none", scrollbarWidth: "none",
          padding: "6px 0",
        }}>
          <div style={{ display: "inline-flex", gap: 8, paddingLeft: 16, paddingRight: 16 }}>
            {(() => {
              const hav = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              };
              // 현재 위치 가져오기
              let userLat = 37.5665, userLng = 126.978;
              try { const p = JSON.parse(sessionStorage.getItem("last_user_pos") || ""); userLat = p.lat; userLng = p.lng; } catch {}
              // 필터 + 거리순 정렬 + 8개 제한
              return featuredCourses.filter((fc) => {
                if (!searchFromCoord && !searchToCoord && searchTagFilter.length === 0) return true;
                const c = fc.course;
                if (searchTagFilter.length > 0 && !searchTagFilter.every((t) => c.tags.includes(t))) return false;
                if (searchFromCoord || searchToCoord) {
                  const wps = c.waypoints;
                  if (!wps || wps.length < 2) return false;
                  if (searchFromCoord && hav(searchFromCoord.lat, searchFromCoord.lng, wps[0].lat, wps[0].lng) > searchRadius) return false;
                  if (searchToCoord && hav(searchToCoord.lat, searchToCoord.lng, wps[wps.length - 1].lat, wps[wps.length - 1].lng) > searchRadius) return false;
                }
                return true;
              }).sort((a, b) => {
                const minDist = (wps: any[]) => Math.min(...wps.map((wp: any) => hav(userLat, userLng, wp.lat, wp.lng)));
                return minDist(a.course.waypoints) - minDist(b.course.waypoints);
              }).slice(0, 8);
            })().map((fc, i) => (
              <button
                key={i}
                onClick={() => {
                  const course = fc.course;
                  setSelectedBrowseCourse(course);
                  browseEndpointMarkersRef.current.forEach((mk) => mk.remove());
                  browseEndpointMarkersRef.current = [];
                  const m = map.current;
                  if (!m) return;
                  if (m.getLayer("browse-route")) m.removeLayer("browse-route");
                  if (m.getSource("browse-route")) m.removeSource("browse-route");
                  if (course.route_geojson) {
                    m.addSource("browse-route", { type: "geojson", data: course.route_geojson });
                    m.addLayer({ id: "browse-route", type: "line", source: "browse-route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": BRAND_COLOR, "line-width": 4, "line-opacity": 0.8 } });
                  }
                  const wps = course.waypoints;
                  if (wps.length >= 2) {
                    const startEl = createEndpointMarkerEl("출발", "#10b981");
                    const endEl = createEndpointMarkerEl("도착", "var(--color-brand)");
                    browseEndpointMarkersRef.current.push(
                      new mapboxgl.Marker({ element: startEl, anchor: "bottom" }).setLngLat([wps[0].lng, wps[0].lat]).addTo(m),
                      new mapboxgl.Marker({ element: endEl, anchor: "bottom" }).setLngLat([wps[wps.length - 1].lng, wps[wps.length - 1].lat]).addTo(m),
                    );
                    const bounds = new mapboxgl.LngLatBounds();
                    wps.forEach((wp) => bounds.extend([wp.lng, wp.lat]));
                    m.fitBounds(bounds, { padding: { top: 120, bottom: 200, left: 60, right: 60 }, maxZoom: 14, duration: 800 });
                  }
                }}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "none",
                  background: selectedBrowseCourse?.id === fc.course.id ? "var(--color-brand)" : "#ffffff",
                  color: selectedBrowseCourse?.id === fc.course.id ? "#ffffff" : "#222222",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                  boxShadow: "var(--shadow-control)",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                {fc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected place card */}
      {selectedPlace && (
        <div style={{
          position: "absolute",
          bottom: mode === "create" && isMobile ? (showSheet ? "calc(40dvh + 16px)" : "calc(var(--bottom-tab-h) + 12px + env(safe-area-inset-bottom, 0px))") : "calc(var(--bottom-tab-h) + 12px + env(safe-area-inset-bottom, 0px))",
          left: 16, right: !isMobile && mode === "create" ? 396 : 16, zIndex: 25,
          background: "#ffffff", borderRadius: 12, padding: "12px 14px",
          boxShadow: "var(--shadow-card)",
          display: "flex", alignItems: "center", gap: 12,
          transition: "bottom 0.3s",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#222222" }}>{selectedPlace.name}</div>
            <div style={{ fontSize: 11, color: "#6a6a6a", marginTop: 2 }}>
              {selectedPlace.category && <span style={{ color: "var(--color-brand)", marginRight: 4 }}>{selectedPlace.category}</span>}
              {selectedPlace.address}
            </div>
          </div>
          {mode === "create" && (
            <button
              onClick={() => {
                addWaypoint(selectedPlace.lng, selectedPlace.lat, selectedPlace.name);
                if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; }
                setSelectedPlace(null);
                setSearchQuery("");
              }}
              style={{
                padding: "8px 16px", borderRadius: 16, border: "none",
                background: "#222222", color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              경유지 추가
            </button>
          )}
          <button
            onClick={() => { setSelectedPlace(null); if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null; } }}
            style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: "#6a6a6a" }}
          >✕</button>
        </div>
      )}

      {/* Browse mode: selected course card — CourseCard variant="popup" */}
      {mode === "explore" && selectedBrowseCourse && (
        <div style={{
          position: "fixed",
          bottom: "calc(var(--bottom-tab-h) + 16px + env(safe-area-inset-bottom, 0px))",
          left: 16,
          right: 16,
          zIndex: 30,
          maxWidth: 420,
          margin: "0 auto",
          animation: "slideUp 300ms var(--ease-out) forwards",
        }}>
          <CourseCard
            variant="popup"
            course={selectedBrowseCourse as any}

            onClose={clearBrowseRoute}
            onDetailClick={(id) => {
              setNavigating(true);
              const m = map.current;
              if (m) {
                const c = m.getCenter();
                sessionStorage.setItem("map_state", JSON.stringify({
                  lng: c.lng, lat: c.lat, zoom: m.getZoom(), courseId: id,
                }));
              }
              window.location.href = `/course/${id}`;
            }}
            source="map"
            onLoginRequired={() => setShowLogin(true)}
          />
        </div>
      )}

      {/* Browse mode: compass + locate user FABs */}
      {mode === "explore" && (
        <div style={{
          position: "absolute",
          bottom: !selectedBrowseCourse && !selectedPlace && !searchMode ? "calc(var(--bottom-tab-h) + 24px + env(safe-area-inset-bottom, 0px))" : "calc(var(--bottom-tab-h) + 24px + env(safe-area-inset-bottom, 0px))",
          right: 12, zIndex: 20,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          transition: "bottom 0.3s",
        }}>
          <button
            onClick={() => { map.current?.easeTo({ bearing: 0, pitch: 0, duration: 400 }); }}
            style={{
              width: 42, height: 42, borderRadius: "50%", border: "none",
              background: "#ffffff", boxShadow: "var(--shadow-card)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 1 L16 12 L12 10 L8 12 Z" fill="var(--color-brand)" />
              <path d="M12 23 L8 12 L12 14 L16 12 Z" fill="#c1c1c1" />
            </svg>
          </button>
          <button onClick={handleLocateUser} disabled={locatingUser} style={{
            width: 42, height: 42, borderRadius: "50%", border: "none",
            background: "#ffffff", boxShadow: "var(--shadow-control)",
            cursor: locatingUser ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {locatingUser ? (
              <span style={{ width: 18, height: 18, border: "2.5px solid #e2e8f0", borderTopColor: "var(--color-info)", borderRadius: "50%", display: "block", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Course search panel */}
      {/* Search panel — 출발/도착/반경/검색 */}
      {searchMode && mode === "explore" && (
        <div style={{
          position: "absolute", top: 60, left: 16, zIndex: 15,
          background: "rgba(255,255,255,0.01)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 14, padding: 16,
          boxShadow: "var(--shadow-card)",
          maxWidth: 360, width: "calc(100% - 32px)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#222222" }}>코스 탐색</div>
            <button onClick={() => setSearchMode(false)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#6a6a6a" }}>✕</button>
          </div>

          {/* From */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1.5px solid ${searchFromCoord ? "#10b981" : "#E0E0E0"}`, borderRadius: 10, background: "#FAFAF8" }}>
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700, flexShrink: 0 }}>출발</span>
              <input
                type="text" value={searchFrom} placeholder="출발지 검색"
                onFocus={() => setSearchFocused("from")}
                onChange={(e) => {
                  const v = e.target.value; setSearchFrom(v); setSearchFromCoord(null);
                  if (searchFromDebounce.current) clearTimeout(searchFromDebounce.current);
                  if (v.trim().length < 2) { setSearchFromResults([]); return; }
                  searchFromDebounce.current = setTimeout(async () => {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(v)}`);
                    const data = await res.json();
                    setSearchFromResults(data.documents || []);
                  }, 300);
                }}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#222222" }}
              />
              {searchFrom && <button onClick={() => { setSearchFrom(""); setSearchFromCoord(null); setSearchFromResults([]); }} style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "#cbd5e1", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>}
            </div>
            {searchFocused === "from" && searchFromResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#ffffff", borderRadius: 10, boxShadow: "var(--shadow-card)", overflow: "hidden", zIndex: 5, maxHeight: 180, overflowY: "auto" }}>
                {searchFromResults.map((p: any, i: number) => (
                  <div key={i} onClick={() => { setSearchFrom(p.place_name); setSearchFromCoord({ lng: parseFloat(p.x), lat: parseFloat(p.y) }); setSearchFromResults([]); setSearchFocused(null); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: i < searchFromResults.length - 1 ? "0.5px solid #f1f5f9" : "none" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#222222" }}>{p.place_name}</div>
                    <div style={{ fontSize: 11, color: "#6a6a6a" }}>{p.road_address_name || p.address_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* To */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1.5px solid ${searchToCoord ? "var(--color-brand)" : "#E0E0E0"}`, borderRadius: 10, background: "#FAFAF8" }}>
              <span style={{ fontSize: 12, color: "var(--color-brand)", fontWeight: 700, flexShrink: 0 }}>도착</span>
              <input
                type="text" value={searchTo} placeholder="도착지 검색"
                onFocus={() => setSearchFocused("to")}
                onChange={(e) => {
                  const v = e.target.value; setSearchTo(v); setSearchToCoord(null);
                  if (searchToDebounce.current) clearTimeout(searchToDebounce.current);
                  if (v.trim().length < 2) { setSearchToResults([]); return; }
                  searchToDebounce.current = setTimeout(async () => {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(v)}`);
                    const data = await res.json();
                    setSearchToResults(data.documents || []);
                  }, 300);
                }}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#222222" }}
              />
              {searchTo && <button onClick={() => { setSearchTo(""); setSearchToCoord(null); setSearchToResults([]); }} style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "#cbd5e1", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>}
            </div>
            {searchFocused === "to" && searchToResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#ffffff", borderRadius: 10, boxShadow: "var(--shadow-card)", overflow: "hidden", zIndex: 5, maxHeight: 180, overflowY: "auto" }}>
                {searchToResults.map((p: any, i: number) => (
                  <div key={i} onClick={() => { setSearchTo(p.place_name); setSearchToCoord({ lng: parseFloat(p.x), lat: parseFloat(p.y) }); setSearchToResults([]); setSearchFocused(null); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: i < searchToResults.length - 1 ? "0.5px solid #f1f5f9" : "none" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#222222" }}>{p.place_name}</div>
                    <div style={{ fontSize: 11, color: "#6a6a6a" }}>{p.road_address_name || p.address_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radius */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#6B7B8D" }}>검색 반경</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#222222" }}>{searchRadius}km</span>
            </div>
            <input type="range" min={5} max={50} step={5} value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--color-brand)" }} />
            <div style={{ fontSize: 11, color: "#6a6a6a", marginTop: 2 }}>출발지·도착지에서 반경 {searchRadius}km 이내 코스를 찾습니다</div>
          </div>

          {(searchFromCoord || searchToCoord) && (
            <div style={{ fontSize: 12, color: "#6a6a6a", textAlign: "center", marginTop: 4 }}>
              실시간으로 코스를 필터링하고 있어요
            </div>
          )}

          {/* Tag filter inside search panel */}
          <div style={{ marginTop: 14, borderTop: "1px solid #f2f2f2", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: "#6B7B8D" }}>태그 필터</div>
              {searchTagFilter.length > 0 && (
                <button onClick={() => setSearchTagFilter([])} style={{ padding: "2px 8px", borderRadius: 8, border: "1px solid #c1c1c1", background: "#fff", fontSize: 11, color: "#6a6a6a", cursor: "pointer" }}>초기화</button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TAG_OPTIONS.map((tag) => {
                const sel = searchTagFilter.includes(tag);
                return (
                  <button key={tag} onClick={() => setSearchTagFilter((prev) => sel ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    style={{ padding: "4px 10px", borderRadius: 14, border: sel ? "1.5px solid #222222" : "1px solid #c1c1c1", background: sel ? "#1f1f1f" : "#fff", color: sel ? "#fff" : "#6a6a6a", fontSize: 11, fontWeight: sel ? 600 : 400, cursor: "pointer" }}
                  >{tag}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter panel — 태그/권역 (독립 토글, 자동 적용) */}

      {/* Browse mode: empty state floating bubble — positioned above Floating Pill */}
      {mode === "explore" && !selectedBrowseCourse && !selectedPlace && !searchMode && visibleCourseCount === 0 && !emptyBubbleDismissed && (
        <div style={{
          position: "fixed",
          bottom: "calc(var(--bottom-tab-h) + var(--space-4) + 52px + var(--space-5) + env(safe-area-inset-bottom, 0px))",
          left: "50%", transform: "translateX(-50%)",
          zIndex: 28,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
          borderRadius: 16, padding: "14px 28px 14px 20px", textAlign: "center",
          boxShadow: "var(--shadow-card)",
          whiteSpace: "nowrap",
        }}>
          <button onClick={() => setEmptyBubbleDismissed(true)} style={{
            position: "absolute", top: 6, right: 6,
            width: 18, height: 18, borderRadius: "50%", border: "none",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#222222" }}>근처에 아직 등록된 코스가 없어요</div>
          <div style={{ fontSize: 10, color: "#6a6a6a", marginTop: 3 }}>나만의 드라이브 코스를 추가해보세요!</div>
        </div>
      )}

      {/* Browse mode: Floating Action Pill CTA */}
      {mode === "explore" && !selectedBrowseCourse && !selectedPlace && !searchMode && (
        <button
          onClick={startCreate}
          onMouseEnter={() => setCtaHovered(true)}
          onMouseLeave={() => { setCtaHovered(false); setCtaPressed(false); }}
          onPointerDown={() => setCtaPressed(true)}
          onPointerUp={() => setCtaPressed(false)}
          style={{
            position: "fixed",
            bottom: "calc(var(--bottom-tab-h) + var(--space-4) + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: ctaPressed
              ? "translateX(-50%) scale(0.97)"
              : ctaHovered
              ? "translateX(-50%) translateY(-1px)"
              : "translateX(-50%)",
            zIndex: 30,
            height: 52,
            padding: "0 var(--space-8)",
            border: "none",
            borderRadius: "var(--radius-full)",
            background: "var(--color-brand)",
            color: "var(--color-text-inverse)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)" as any,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: ctaPressed
              ? "var(--shadow-card)"
              : ctaHovered
              ? "var(--shadow-hover)"
              : "var(--shadow-float)",
            transition: "transform 150ms var(--ease-out), box-shadow 150ms var(--ease-out)",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          루트북 추가하기
        </button>
      )}

      {/* Create mode: FABs — horizontal row, hidden during animation */}
      {mode === "create" && <div
        style={{
          position: "absolute",
          bottom: isMobile ? (showSheet ? "calc(40dvh + 16px)" : "calc(var(--bottom-tab-h) + 12px + env(safe-area-inset-bottom, 0px))") : "calc(var(--bottom-tab-h) + 12px + env(safe-area-inset-bottom, 0px))",
          right: !isMobile ? 396 : 12,
          display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 12,
          zIndex: 20, transition: "bottom 0.3s, right 0.3s",
        }}
      >
        {/* 경유지 추가 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <button onClick={() => setAddingWaypoint((v) => !v)} style={{
            width: 42, height: 42, borderRadius: "50%",
            border: addingWaypoint ? "2px solid #e0e2e6" : "none",
            background: addingWaypoint ? "#ffffff" : "var(--color-brand)",
            boxShadow: "var(--shadow-control)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={addingWaypoint ? "#222222" : "#fff"} strokeWidth="2" strokeLinecap="round">
              {addingWaypoint ? (<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>) : (<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>)}
            </svg>
          </button>
        </div>
        {/* 현재 위치 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <button onClick={handleLocateUser} disabled={locatingUser} style={{
            width: 42, height: 42, borderRadius: "50%", border: "none",
            background: "#ffffff", boxShadow: "var(--shadow-control)",
            cursor: locatingUser ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {locatingUser ? (
              <span style={{ width: 18, height: 18, border: "2.5px solid #e2e8f0", borderTopColor: "var(--color-info)", borderRadius: "50%", display: "block", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </div>}


      {/* Cancel confirm modal */}
      {showCancelConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: 16, padding: 20, width: "min(300px, calc(100% - 48px))", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#222222" }}>코스 작성을 그만할까요?</div>
            <div style={{ fontSize: 13, color: "#6a6a6a", lineHeight: 1.5 }}>나가면 작성 중인 내용이 사라져요</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowCancelConfirm(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #e0e2e6", background: "#ffffff", fontSize: 14, fontWeight: 500, color: "#222222", cursor: "pointer", letterSpacing: 0.08 }}>계속 작성</button>
              <button onClick={() => { setShowCancelConfirm(false); cancelCreate(); }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #e0e2e6", background: "#ffffff", fontSize: 14, fontWeight: 500, color: "#e03e3e", cursor: "pointer", letterSpacing: 0.08 }}>나가기</button>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => { setShowLogin(false); handleSaveCourse(); }} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes locPulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>

      {/* Mini bar — tap to reopen sheet (mobile only) */}
      {mode === "create" && isMobile && (
        <div
          onClick={() => {
            setShowSheet(true);
            if (waypoints.length > 0) {
              const lastWp = waypoints[waypoints.length - 1];
              map.current?.easeTo({ center: [lastWp.lng, lastWp.lat], padding: { bottom: window.innerHeight * 0.5 }, duration: 300 });
            }
          }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9,
            background: "#ffffff", borderRadius: "16px 16px 0 0",
            boxShadow: "var(--shadow-panel-top)",
            padding: "12px 20px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transform: showSheet ? "translateY(100%)" : "translateY(0)",
            transition: "transform 0.3s ease",
            pointerEvents: showSheet ? "none" : "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color-brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#222222" }}>{["경유지 순서", "감성 태그", "코스 정보", "음악 첨부"][createStep - 1]}</div>
              <div style={{ fontSize: 11, color: "#6a6a6a" }}>{createStep}/4 단계 · 탭하여 열기</div>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
        </div>
      )}

      {/* Create panel — bottom sheet (mobile) / side panel (desktop) */}
      {mode === "create" && (
        <div style={isMobile ? {
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          height: "40dvh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "20px 20px 0 0",
          boxShadow: "var(--shadow-panel-top)",
          zIndex: 10,
          display: "flex", flexDirection: "column",
          transform: showSheet ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s ease",
        } : {
          position: "absolute",
          top: 0, right: 0,
          width: 380, height: "100%",
          overflowY: "auto",
          background: "#ffffff",
          borderLeft: "0.5px solid #e2e8f0",
          zIndex: 10,
          display: "flex", flexDirection: "column",
        }}>
          {/* Drag handle — mobile only, swipe down to dismiss */}
          {isMobile && (
            <div
              style={{ padding: "10px 16px 0", cursor: "grab", touchAction: "none", position: "sticky", top: 0, zIndex: 1, background: "#ffffff", borderRadius: "20px 20px 0 0" }}
              onTouchStart={(e) => {
                const startY = e.touches[0].clientY;
                const el = e.currentTarget.parentElement!;
                el.style.transition = "none";
                const onMove = (ev: TouchEvent) => {
                  const dy = ev.touches[0].clientY - startY;
                  if (dy > 0) el.style.transform = `translateY(${dy}px)`;
                };
                const onEnd = (ev: TouchEvent) => {
                  const dy = ev.changedTouches[0].clientY - startY;
                  document.removeEventListener("touchmove", onMove);
                  document.removeEventListener("touchend", onEnd);
                  el.style.transition = "transform 0.3s ease";
                  if (dy > 80) {
                    setShowSheet(false);
                    map.current?.easeTo({ padding: { bottom: 0 }, duration: 300 });
                  } else {
                    el.style.transform = "translateY(0)";
                  }
                };
                document.addEventListener("touchmove", onMove, { passive: false });
                document.addEventListener("touchend", onEnd);
              }}
            >
              <div style={{ width: 36, height: 4, background: "#cbd5e1", borderRadius: 2, margin: "0 auto 12px" }} />
            </div>
          )}
          {/* Progress bar */}
          <div style={{ padding: "12px 16px 8px", display: "flex", gap: 4 }}>
            {[1,2,3,4].map((s) => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= createStep ? "var(--color-brand)" : "#dddddd", transition: "background 0.2s" }} />
            ))}
          </div>

          {/* Step content */}
          <div data-step-content style={{ padding: "8px 16px 14px", flex: 1, overflowY: "auto" }}>

            {/* Step 1: 경유지 */}
            {createStep === 1 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#222222" }}>경유지 순서</div>
                  {waypoints.length > 0 && (
                    <button
                      onClick={() => {
                        waypoints.forEach((wp) => { markersRef.current.get(wp.id)?.remove(); markersRef.current.delete(wp.id); });
                        setWaypoints([]);
                        setWaypointRouteSummary(null);
                        setRouteGeojson(null);
                        const m = map.current;
                        if (m) {
                          const src = m.getSource(WAYPOINT_ROUTE_SOURCE) as mapboxgl.GeoJSONSource;
                          if (src) src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } });
                          m.setLayoutProperty(WAYPOINT_ROUTE_LAYER, "visibility", "none");
                        }
                      }}
                      style={{ fontSize: 12, color: "var(--color-brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                    >
                      전체 삭제
                    </button>
                  )}
                </div>
                {waypoints.length === 0 ? (
                  <div style={{
                    padding: "32px 16px", textAlign: "center",
                    background: "#F8F8F6", borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#222222", marginBottom: 4 }}>경유지를 추가해주세요</div>
                    <div style={{ fontSize: 12, color: "#6a6a6a", lineHeight: 1.5 }}>지도를 클릭하거나 검색으로 장소를 추가하세요</div>
                    <div style={{ fontSize: 11, color: "var(--color-brand)", marginTop: 10, lineHeight: 1.4, background: "rgba(255,56,92,0.06)", borderRadius: 8, padding: "8px 12px" }}>
                      💡 도로 위를 정확히 찍으면 경로가 더 정확해요
                    </div>
                  </div>
                ) : (
                  <>
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCenter}
                      onDragStart={() => {
                        const el = document.querySelector("[data-step-content]") as HTMLElement;
                        if (el) el.style.overflowY = "hidden";
                      }}
                      onDragEnd={(event) => {
                        const el = document.querySelector("[data-step-content]") as HTMLElement;
                        if (el) el.style.overflowY = "auto";
                        reorderWaypoints(event);
                      }}
                      onDragCancel={() => {
                        const el = document.querySelector("[data-step-content]") as HTMLElement;
                        if (el) el.style.overflowY = "auto";
                      }}
                    >
                      <SortableContext items={waypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                        {waypoints.map((wp, i) => (
                          <SortableWaypointItem key={wp.id} wp={wp} index={i} isFirst={i === 0} isLast={i === waypoints.length - 1} onRemove={removeWaypoint} onUpdate={(id, data) => setWaypoints((prev) => prev.map((w) => w.id === id ? { ...w, ...data } : w))} />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <div style={{ fontSize: 12, color: "#6a6a6a", marginTop: 8 }}>지도에서 경유지를 추가하거나 검색하세요</div>
                    {waypointRouteSummary && waypoints.length >= 2 && (
                      <div style={{
                        marginTop: 12, padding: "10px 14px", borderRadius: 10,
                        background: "#F8F8F6", display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#222222" }}>
                          {(waypointRouteSummary.distance / 1000).toFixed(1)}km · {formatDuration(waypointRouteSummary.duration)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Step 2: 감성 태그 */}
            {createStep === 2 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#222222", marginBottom: 4 }}>감성 태그</div>
                <div style={{ fontSize: 12, color: "#6a6a6a", marginBottom: 12 }}>이 코스의 분위기를 선택해주세요 (최대 3개)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TAG_OPTIONS.map((tag) => {
                    const selected = courseTags.includes(tag);
                    return (
                      <button key={tag} onClick={() => toggleTag(tag)} style={{
                        padding: "8px 16px", borderRadius: 16,
                        border: selected ? "none" : "1px solid #dddddd",
                        background: selected ? "var(--color-brand)" : "#fff", color: selected ? "#fff" : "#6a6a6a",
                        fontSize: 13, fontWeight: selected ? 600 : 400,
                        cursor: !selected && courseTags.length >= 3 ? "not-allowed" : "pointer",
                        opacity: !selected && courseTags.length >= 3 ? 0.4 : 1, transition: "all 0.15s",
                      }}>{tag}</button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Step 3: 코스 이름 + 한줄 소개 */}
            {createStep === 3 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#222222", marginBottom: 12 }}>코스 정보</div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#6B7B8D", marginBottom: 4, display: "block" }}>코스 이름</label>
                  <input type="text" maxLength={30} value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="예: 한강 야경 드라이브"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E0E0E0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <div style={{ fontSize: 11, color: courseTitle.trim().length > 0 && !titleValid ? "var(--color-brand)" : "transparent" }}>
                      {COMPLETE_CHARS.length < 2 ? "완성된 글자 2자 이상 입력해주세요" : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#6a6a6a" }}>{courseTitle.length}/30</div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#6B7B8D", marginBottom: 4, display: "block" }}>한 줄 소개</label>
                  <input type="text" maxLength={60} value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)}
                    placeholder="이 코스를 한 줄로 소개해주세요"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #E0E0E0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 11, color: "#6a6a6a", textAlign: "right", marginTop: 2 }}>{courseDesc.length}/60</div>
                </div>
              </>
            )}

            {/* Step 4: 음악 */}
            {createStep === 4 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#222222", marginBottom: 4 }}>음악 첨부</div>
                <div style={{ fontSize: 12, color: "#6a6a6a", marginBottom: 12 }}>YouTube 링크로 배경 음악을 추가하세요 (선택)</div>
                <div style={{ position: "relative" }}>
                  <input type="text" value={musicUrl} onChange={(e) => handleMusicUrlChange(e.target.value)}
                    placeholder="YouTube 링크를 붙여넣어 주세요"
                    style={{ width: "100%", padding: "10px 56px 10px 12px", border: `1px solid ${musicUrlTouched ? (musicUrlValid ? "#10b981" : "var(--color-brand)") : "#e2e8f0"}`, borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  {musicUrlTouched && (
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 14, color: musicUrlValid ? "#10b981" : "var(--color-brand)" }}>{musicUrlValid ? "✓" : "✗"}</span>
                      <button onClick={() => handleMusicUrlChange("")} style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "#e2e8f0", color: "#6B7B8D", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                    </span>
                  )}
                </div>
                {musicUrlTouched && !musicUrlValid && <div style={{ fontSize: 11, color: "var(--color-brand)", marginTop: 3 }}>올바른 YouTube 링크를 입력해주세요</div>}
                {musicUrlValid && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div id="yt-preview-container" style={{ width: "100%", borderRadius: 8, overflow: "hidden", background: "#000", aspectRatio: "16/9" }} />
                    <div style={{ fontSize: 11, color: "#6B7B8D" }}>시작 지점 (45초 자동 재생)</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flex: 1 }}>
                        <input type="number" min="0" placeholder="0" value={startMin} onChange={(e) => setStartMin(e.target.value)} style={{ width: "100%", padding: "6px 4px", border: "1px solid #E0E0E0", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                        <span style={{ fontSize: 11, color: "#6a6a6a", flexShrink: 0 }}>분</span>
                        <input type="number" min="0" max="59" placeholder="0" value={startSecInput} onChange={(e) => setStartSecInput(e.target.value)} style={{ width: "100%", padding: "6px 4px", border: "1px solid #E0E0E0", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                        <span style={{ fontSize: 11, color: "#6a6a6a", flexShrink: 0 }}>초</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#6a6a6a" }}>~</span>
                      <div style={{ flex: 1, padding: "6px 4px", background: "#ffffff", borderRadius: 6, fontSize: 12, color: "#6B7B8D", textAlign: "center" }}>{Math.floor(musicEndSec / 60)}분 {musicEndSec % 60}초</div>
                    </div>
                    <button onClick={handlePreviewPlay} disabled={!previewReadyRef.current && !previewing} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: previewing ? "1.5px solid #c13515" : "1.5px solid #e2e8f0", background: previewing ? "#fef2f2" : "#fff", color: previewing ? "var(--color-brand)" : "var(--color-brand)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {previewing ? "정지 ■" : "구간 미리듣기 ▶"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step navigation buttons */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #F4F4F4", display: "flex", gap: 8 }}>
            {/* Red X cancel button */}
            <button onClick={() => setShowCancelConfirm(true)} style={{
              width: 40, height: 40, borderRadius: 10, border: "none",
              background: "#fef2f2", cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {createStep > 1 && (
              <button onClick={() => setCreateStep((s) => s - 1)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10,
                border: "1px solid #c1c1c1", background: "#ffffff",
                fontSize: 14, fontWeight: 600, color: "#222222", cursor: "pointer",
              }}>이전</button>
            )}
            {createStep < 4 ? (
              <button
                onClick={() => {
                  if (createStep === 1 && waypoints.length < 2) { setToast({ message: "경유지를 2개 이상 추가해주세요", type: "error" }); return; }
                  if (createStep === 2 && courseTags.length === 0) { setToast({ message: "감성 태그를 1개 이상 선택해주세요", type: "error" }); return; }
                  if (createStep === 3 && !titleValid) { setToast({ message: "코스 이름을 2글자 이상 입력해주세요", type: "error" }); return; }
                  setCreateStep((s) => s + 1);
                }}
                style={{
                  flex: 2, padding: "10px 0", borderRadius: "var(--radius-md)", border: "none",
                  background: "var(--color-brand)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >다음</button>
            ) : (
              <button
                onClick={handleSaveCourse}
                disabled={saving}
                style={{
                  flex: 2, padding: "10px 0", borderRadius: "var(--radius-md)", border: "none",
                  background: saving ? "#dddddd" : "var(--color-brand)", color: "#fff",
                  fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {saving && <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />}
                {saving ? "저장 중..." : editId ? "수정 완료" : "코스 저장"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
