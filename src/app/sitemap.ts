import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const baseUrl = "https://routebook-app.vercel.app";

  // 고정 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/map`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/feed`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
  ];

  // 공개 코스 페이지
  const { data: courses } = await supabase
    .from("courses")
    .select("id, updated_at")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(500);

  const coursePages: MetadataRoute.Sitemap = (courses || []).map((course) => ({
    url: `${baseUrl}/course/${course.id}`,
    lastModified: new Date(course.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 공개 프로필 페이지
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .limit(500);

  const profilePages: MetadataRoute.Sitemap = (profiles || []).map((p) => ({
    url: `${baseUrl}/profile/${p.id}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...coursePages, ...profilePages];
}
