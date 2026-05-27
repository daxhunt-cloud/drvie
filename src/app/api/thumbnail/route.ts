import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// 앱 아이콘을 base64로 인라인 (Vercel Serverless에서 fs 접근 불가 방지)
let cachedIcon: Buffer | null = null;

async function getIcon(origin: string): Promise<Buffer> {
  if (cachedIcon) return cachedIcon;
  const res = await fetch(`${origin}/icon-rounded.png`);
  cachedIcon = Buffer.from(await res.arrayBuffer());
  return cachedIcon;
}

export async function GET(request: NextRequest) {
  // URL 파라미터 이후의 전체 문자열을 mapUrl로 사용 (중첩 쿼리 보존)
  const fullUrl = request.url;
  const marker = "url=";
  const idx = fullUrl.indexOf(marker);
  const mapUrl = idx >= 0 ? decodeURIComponent(fullUrl.slice(idx + marker.length)) : null;
  if (!mapUrl) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    // Fetch mapbox thumbnail
    const mapRes = await fetch(mapUrl);
    if (!mapRes.ok) return NextResponse.json({ error: "Failed to fetch map: " + mapRes.status }, { status: 502 });
    const mapBuffer = Buffer.from(await mapRes.arrayBuffer());

    // Fetch app icon
    const origin = new URL(request.url).origin;
    const iconBuffer = await getIcon(origin);

    // Get map image dimensions, icon = 1/4 of shorter side (1/16 area)
    const mapMeta = await sharp(mapBuffer).metadata();
    const shorter = Math.min(mapMeta.width || 600, mapMeta.height || 600);
    const iconSize = Math.round(shorter / 4);
    const r = Math.round(iconSize * 0.18);

    // Resize icon and apply rounded corners
    const iconResizedRaw = await sharp(iconBuffer).resize(iconSize, iconSize).png().toBuffer();
    const roundMask = Buffer.from(
      `<svg width="${iconSize}" height="${iconSize}"><rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${r}" ry="${r}" fill="white"/></svg>`
    );
    const iconResized = await sharp(iconResizedRaw)
      .composite([{ input: roundMask, blend: "dest-in" }])
      .png()
      .toBuffer();

    // Composite: icon on top-left corner (no padding)
    const pad = 0;
    const result = await sharp(mapBuffer)
      .composite([{ input: iconResized, top: pad, left: pad }])
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(result), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
