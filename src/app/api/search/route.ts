import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const KAKAO_HEADERS = { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` };

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(ip, { limit: 30, windowMs: 60000 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const query = request.nextUrl.searchParams.get("q");
  const lng = request.nextUrl.searchParams.get("lng");
  const lat = request.nextUrl.searchParams.get("lat");

  if (!query) return NextResponse.json({ documents: [] });

  // 1. Keyword search
  const keywordParams = new URLSearchParams({ query, size: "7", sort: "accuracy" });
  if (lng && lat) { keywordParams.set("x", lng); keywordParams.set("y", lat); }
  const keywordRes = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${keywordParams}`,
    { headers: KAKAO_HEADERS }
  );
  const keywordData = await keywordRes.json();

  // 2. Address search (road name / jibun address)
  const addressParams = new URLSearchParams({ query, size: "3" });
  const addressRes = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?${addressParams}`,
    { headers: KAKAO_HEADERS }
  );
  const addressData = await addressRes.json();

  // Convert address results to same format as keyword results
  const addressDocs = (addressData.documents || []).map((doc: any) => ({
    place_name: doc.address_name,
    category_group_name: "주소",
    road_address_name: doc.road_address?.address_name || "",
    address_name: doc.address?.address_name || doc.address_name,
    x: doc.x,
    y: doc.y,
  }));

  // Merge: keyword results first, then address results (deduplicated)
  const keywordDocs = keywordData.documents || [];
  const seen = new Set(keywordDocs.map((d: any) => `${d.x},${d.y}`));
  const merged = [
    ...keywordDocs,
    ...addressDocs.filter((d: any) => !seen.has(`${d.x},${d.y}`)),
  ];

  return NextResponse.json({ documents: merged });
}
