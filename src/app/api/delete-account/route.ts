import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(ip, { limit: 3, windowMs: 60000 });
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabaseResponse = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    // 1. 코스에 첨부된 사진 삭제 (Storage)
    const { data: courses } = await supabase.from("courses").select("id").eq("user_id", userId);
    if (courses) {
      for (const course of courses) {
        const { data: files } = await supabase.storage.from("course-photos").list(`${userId}/${course.id}`);
        if (files?.length) {
          await supabase.storage.from("course-photos").remove(
            files.map((f) => `${userId}/${course.id}/${f.name}`)
          );
        }
      }
    }

    // 2. 아바타 삭제
    const { data: avatarFiles } = await supabase.storage.from("avatars").list(userId);
    if (avatarFiles?.length) {
      await supabase.storage.from("avatars").remove(
        avatarFiles.map((f) => `${userId}/${f.name}`)
      );
    }

    // 3. DB 데이터 삭제 (FK 순서: likes → comments → bookmarks → courses → profiles)
    await supabase.from("likes").delete().eq("user_id", userId);
    await supabase.from("comments").delete().eq("user_id", userId);
    await supabase.from("bookmarks").delete().eq("user_id", userId);
    await supabase.from("bookmarks").delete().eq("target_user_id", userId);
    await supabase.from("courses").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    // 4. 로그아웃
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete account" }, { status: 500 });
  }
}
