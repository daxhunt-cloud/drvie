import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const VISION_KEY = process.env.GOOGLE_CLOUD_VISION_KEY;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(ip, { limit: 10, windowMs: 60000 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!VISION_KEY) {
    return NextResponse.json({ safe: true }); // skip if no key configured
  }

  try {
    const { image } = await req.json(); // base64 string (no prefix)

    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: image },
              features: [{ type: "SAFE_SEARCH_DETECTION" }],
            },
          ],
        }),
      }
    );

    const data = await res.json();
    const annotation = data.responses?.[0]?.safeSearchAnnotation;

    if (!annotation) {
      return NextResponse.json({ safe: true });
    }

    // LIKELY or VERY_LIKELY = block
    const blocked = ["LIKELY", "VERY_LIKELY"];
    const unsafe =
      blocked.includes(annotation.adult) ||
      blocked.includes(annotation.violence) ||
      blocked.includes(annotation.racy);

    return NextResponse.json({
      safe: !unsafe,
      reason: unsafe
        ? annotation.adult !== "VERY_UNLIKELY" && annotation.adult !== "UNLIKELY"
          ? "adult"
          : annotation.violence !== "VERY_UNLIKELY" && annotation.violence !== "UNLIKELY"
          ? "violence"
          : "racy"
        : null,
    });
  } catch {
    return NextResponse.json({ safe: true }); // fail open
  }
}
