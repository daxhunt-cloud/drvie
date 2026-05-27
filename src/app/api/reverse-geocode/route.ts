import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const KAKAO_HEADERS = { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` };

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(ip, { limit: 30, windowMs: 60000 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const lng = request.nextUrl.searchParams.get("lng");
  const lat = request.nextUrl.searchParams.get("lat");
  if (!lng || !lat) return NextResponse.json({ error: "Missing lng/lat" }, { status: 400 });

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
      { headers: KAKAO_HEADERS }
    );
    const data = await res.json();
    // region_type "H" = 행정동
    const doc = data.documents?.find((d: any) => d.region_type === "H") || data.documents?.[0];
    if (doc) {
      return NextResponse.json({
        name: doc.region_3depth_name || doc.region_2depth_name || doc.region_1depth_name,
        full: `${doc.region_1depth_name} ${doc.region_2depth_name} ${doc.region_3depth_name}`.trim(),
      });
    }
    return NextResponse.json({ name: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, full: "" });
  } catch {
    return NextResponse.json({ name: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, full: "" });
  }
}
