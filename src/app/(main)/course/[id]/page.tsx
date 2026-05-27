import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCourseThumbnail } from "@/lib/map-utils";
import CoursePageClient from "./CoursePageClient";

interface Props {
  params: { id: string };
}

async function getCourse(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, profiles(id, nickname, avatar_url)")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse(params.id);

  if (!course || course.visibility !== "public") {
    return { title: "루트북 - Routebook" };
  }

  const thumbnail = getCourseThumbnail(course.waypoints, course.route_geojson, "600x315");
  const authorName = course.profiles?.nickname || "루트북 유저";
  const tags = course.tags?.slice(0, 3).map((t: string) => `#${t}`).join(" ") || "";
  const desc = course.description || `${authorName}님의 ${course.distance_km}km 드라이브 코스 ${tags}`;

  return {
    title: `${course.title} - 루트북`,
    description: desc,
    openGraph: {
      title: course.title,
      description: desc,
      images: thumbnail ? [{ url: thumbnail, width: 1200, height: 630 }] : ["/icon-512.png"],
      type: "article",
    },
  };
}

export default async function CoursePage({ params }: Props) {
  const course = await getCourse(params.id);

  // JSON-LD 구조화 데이터
  const jsonLd = course && course.visibility === "public" ? {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: course.title,
    description: course.description || `${course.distance_km}km 드라이브 코스`,
    touristType: "드라이브",
    provider: {
      "@type": "Organization",
      name: "루트북 Routebook",
      url: "https://routebook-app.vercel.app",
    },
    author: {
      "@type": "Person",
      name: course.profiles?.nickname || "루트북 유저",
    },
    ...(course.waypoints?.length >= 2 ? {
      itinerary: course.waypoints.map((wp: any, i: number) => ({
        "@type": "Place",
        name: wp.name,
        geo: { "@type": "GeoCoordinates", latitude: wp.lat, longitude: wp.lng },
        position: i + 1,
      })),
    } : {}),
    distance: { "@type": "QuantitativeValue", value: course.distance_km, unitCode: "KMT" },
    ...(course.duration_min ? { duration: `PT${course.duration_min}M` } : {}),
    keywords: [...(course.tags || []), ...(course.region_tags || [])].join(", "),
    url: `https://routebook-app.vercel.app/course/${params.id}`,
    image: getCourseThumbnail(course.waypoints, course.route_geojson, "600x600"),
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CoursePageClient courseId={params.id} initialCourse={course} />
    </>
  );
}
