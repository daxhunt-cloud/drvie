// Polyline encoding (Google format, used by Mapbox Static API)
function encodePolyline(coords: [number, number][]): string {
  let result = "";
  let prevLat = 0, prevLng = 0;
  for (const [lng, lat] of coords) {
    const dLat = Math.round((lat - prevLat) * 1e5);
    const dLng = Math.round((lng - prevLng) * 1e5);
    prevLat = lat; prevLng = lng;
    result += encodeValue(dLat) + encodeValue(dLng);
  }
  return result;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  result += String.fromCharCode(v + 63);
  return result;
}

export function getCourseThumbnail(waypoints: any[], routeGeojson?: any, size = "400x240") {
  if (!waypoints || waypoints.length === 0) return "";
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  let pathOverlay = "";
  if (routeGeojson?.coordinates?.length > 0) {
    const coords: [number, number][] = routeGeojson.coordinates;
    const step = Math.max(1, Math.floor(coords.length / 100));
    const sampled = coords.filter((_: any, i: number) => i % step === 0);
    const encoded = encodePolyline(sampled);
    pathOverlay = `path-4+ff385c-0.8(${encodeURIComponent(encoded)}),`;
  }

  const pins = waypoints.slice(0, 5).map((w: any, i: number) =>
    i === 0 ? `pin-s+10b981(${w.lng},${w.lat})` : i === waypoints.length - 1 ? `pin-s+ff385c(${w.lng},${w.lat})` : `pin-s+888888(${w.lng},${w.lat})`
  ).join(",");

  // auto: 경로+핀에 맞춰 자동 줌/중심, padding 40px
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathOverlay}${pins}/auto/${size}@2x?padding=40&access_token=${token}`;
}
