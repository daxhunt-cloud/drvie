"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const ROUTE_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];
const PREVIEW_SOURCE = "preview-line";
const PREVIEW_LAYER = "preview-line-layer";
const WAYPOINT_ROUTE_SOURCE = "route-source";
const WAYPOINT_ROUTE_LAYER = "route";
const CLICK_THRESHOLD = 5; // px — under this = click, over = drag

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

  // We need a ref to track waypoints inside map event handlers
  const waypointsRef = useRef<Waypoint[]>([]);
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

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

  const removeWaypoint = useCallback((id: string) => {
    const marker = markersRef.current.get(id);
    if (marker) {
      marker.remove();
      markersRef.current.delete(id);
    }
    setWaypoints((prev) => {
      const next = prev.filter((w) => w.id !== id);
      // Renumber remaining markers
      next.forEach((w, i) => {
        const m = markersRef.current.get(w.id);
        if (m) {
          const el = m.getElement();
          el.textContent = String(i + 1);
        }
      });
      return next;
    });
  }, []);

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
      } else if (mouseDownPt.current) {
        // Click → add waypoint
        addWaypoint(e.lngLat.lng, e.lngLat.lat);
      }

      mouseDownPt.current = null;
      startPt.current = null;
    });

    return () => {
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
      return;
    }

    const coords = waypoints.map((wp) => `${wp.lng},${wp.lat}`).join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

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
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [waypoints]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

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
            padding: "12px 28px",
            borderRadius: 40,
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          총 {(waypointRouteSummary.distance / 1000).toFixed(1)}km · 약 {formatDuration(waypointRouteSummary.duration)}
        </div>
      )}

      {/* Waypoints panel - right side */}
      {waypoints.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 60,
            width: 260,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        >
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
          {waypoints.map((wp, i) => (
            <div
              key={wp.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderBottom: i < waypoints.length - 1 ? "1px solid #f1f5f9" : "none",
              }}
            >
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
                {i + 1}
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
                onClick={() => removeWaypoint(wp.id)}
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
          ))}
        </div>
      )}
    </div>
  );
}
