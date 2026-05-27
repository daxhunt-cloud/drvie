"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import UserProfileClient from "./UserProfileClient";

export default function UserProfilePage() {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id === userId) { router.replace("/settings"); return; }

    (async () => {
      const [profileRes, coursesRes, bookmarkRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("courses").select("id, title, distance_km, tags, waypoints, route_geojson, like_count").eq("user_id", userId).eq("visibility", "public").order("created_at", { ascending: false }),
        user ? supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("target_user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      if (!profileRes.data) { router.replace("/map"); return; }

      const courses = coursesRes.data || [];
      setData({
        profile: profileRes.data,
        courses,
        totalLikes: courses.reduce((sum: number, c: any) => sum + (c.like_count ?? 0), 0),
        initialBookmarked: !!bookmarkRes.data,
      });
      setLoading(false);
    })();
  }, [userId, user]);

  if (loading || !data) return <div style={{ minHeight: "100dvh", background: "#FFFFFF" }} />;

  return (
    <UserProfileClient
      userId={userId}
      profile={data.profile}
      courses={data.courses}
      totalLikes={data.totalLikes}
      initialBookmarked={data.initialBookmarked}
    />
  );
}
