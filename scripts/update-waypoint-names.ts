// 기존 코스의 경유지 이름을 카카오 역지오코딩으로 업데이트
// 실행: npx tsx scripts/update-waypoint-names.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY!;

async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
  );
  const data = await res.json();
  const doc = data.documents?.find((d: any) => d.region_type === "H") || data.documents?.[0];
  if (doc) return doc.region_3depth_name || doc.region_2depth_name || doc.region_1depth_name;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function main() {
  // Fetch all courses
  const res = await fetch(`${SUPABASE_URL}/rest/v1/courses?select=id,waypoints&visibility=eq.public`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const courses = await res.json();
  console.log(`Found ${courses.length} courses`);

  for (const course of courses) {
    const wps = course.waypoints as { lng: number; lat: number; name: string; memo?: string; photoUrl?: string }[];
    if (!wps || wps.length === 0) continue;

    let updated = false;
    const newWps = [];

    for (const wp of wps) {
      const newName = await reverseGeocode(wp.lng, wp.lat);
      if (newName !== wp.name) updated = true;
      newWps.push({ ...wp, name: newName });
      // Rate limit: 100ms between calls
      await new Promise((r) => setTimeout(r, 100));
    }

    if (updated) {
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/courses?id=eq.${course.id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ waypoints: newWps }),
      });
      console.log(`Updated: ${course.id} (${updateRes.status})`);
    } else {
      console.log(`Skipped: ${course.id} (no changes)`);
    }
  }

  console.log("Done!");
}

main().catch(console.error);
