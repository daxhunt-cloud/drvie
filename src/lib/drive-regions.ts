// 드라이브 권역 정의 — 중심 좌표 + 반경(km)으로 매칭
export interface DriveRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export const DRIVE_REGIONS: DriveRegion[] = [
  // 수도권
  { id: "seoul-city", name: "서울 도심", lat: 37.5665, lng: 126.978, radiusKm: 8 },
  { id: "seoul-outer", name: "서울 외곽", lat: 37.65, lng: 127.05, radiusKm: 15 },
  { id: "gyeonggi-north", name: "경기 북부", lat: 37.88, lng: 126.95, radiusKm: 25 },
  { id: "gyeonggi-east", name: "경기 동부", lat: 37.52, lng: 127.5, radiusKm: 25 },
  { id: "gyeonggi-south", name: "경기 남부", lat: 37.25, lng: 127.0, radiusKm: 25 },
  { id: "incheon-west", name: "인천/서해", lat: 37.45, lng: 126.55, radiusKm: 25 },

  // 강원
  { id: "gangwon-coast", name: "영동 해안", lat: 37.75, lng: 128.9, radiusKm: 40 },
  { id: "gangwon-mountain", name: "영서 산간", lat: 37.7, lng: 128.2, radiusKm: 35 },

  // 충청
  { id: "chung-west", name: "충청 서해안", lat: 36.5, lng: 126.5, radiusKm: 35 },
  { id: "chung-inland", name: "충청 내륙", lat: 36.8, lng: 128.0, radiusKm: 35 },

  // 전라
  { id: "jeon-west", name: "전라 서해안", lat: 35.4, lng: 126.4, radiusKm: 35 },
  { id: "jeon-south", name: "전라 남해안", lat: 34.75, lng: 127.5, radiusKm: 35 },
  { id: "jeon-inland", name: "전라 내륙", lat: 35.6, lng: 127.3, radiusKm: 30 },

  // 경상
  { id: "gyeong-east", name: "경상 동해안", lat: 36.2, lng: 129.35, radiusKm: 35 },
  { id: "gyeong-south", name: "경상 남해안", lat: 34.85, lng: 128.5, radiusKm: 35 },
  { id: "gyeong-inland", name: "경상 내륙", lat: 36.5, lng: 128.7, radiusKm: 35 },

  // 부산/울산
  { id: "busan-ulsan", name: "부산/울산", lat: 35.15, lng: 129.05, radiusKm: 20 },

  // 제주
  { id: "jeju", name: "제주", lat: 33.38, lng: 126.55, radiusKm: 35 },
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 좌표로부터 가장 가까운 드라이브 권역을 반환
 */
export function getRegionByCoord(lat: number, lng: number): DriveRegion | null {
  let best: DriveRegion | null = null;
  let bestDist = Infinity;
  for (const region of DRIVE_REGIONS) {
    const dist = haversine(lat, lng, region.lat, region.lng);
    if (dist <= region.radiusKm && dist < bestDist) {
      best = region;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * 출발지/도착지 경유지들로부터 region_tags를 자동 생성
 * 출발지 + 도착지 기준, 중복 제거
 */
export function autoRegionTags(waypoints: { lat: number; lng: number }[]): string[] {
  if (waypoints.length === 0) return [];
  const points = waypoints.length >= 2
    ? [waypoints[0], waypoints[waypoints.length - 1]]
    : [waypoints[0]];
  const tags: string[] = [];
  for (const wp of points) {
    const region = getRegionByCoord(wp.lat, wp.lng);
    if (region && !tags.includes(region.name)) {
      tags.push(region.name);
    }
  }
  return tags;
}

/**
 * 탐색용 권역 이름 목록
 */
export const REGION_NAMES = DRIVE_REGIONS.map((r) => r.name);
