"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CourseDetailPage from "@/components/CourseDetailPage";

export default function CoursePageClient({ courseId, initialCourse }: { courseId: string; initialCourse: any }) {
  const { user } = useAuth();
  const router = useRouter();
  const [course] = useState<any>(initialCourse);

  useEffect(() => {
    if (!course) { router.replace("/map"); return; }
    if (course.visibility === "draft" && (!user || user.id !== course.user_id)) { router.replace("/map"); }
  }, [course, user]);

  if (!course) return <div style={{ minHeight: "100dvh", background: "#FFFFFF" }} />;

  return <CourseDetailPage course={course} />;
}
