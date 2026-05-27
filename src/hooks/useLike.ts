"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface UseLikeProps {
  courseId: string;
  initialLikeCount: number;
  initialLiked?: boolean;
  ownerId?: string;
  onLoginRequired?: () => void;
}

export function useLike({ courseId, initialLikeCount, initialLiked = false, ownerId, onLoginRequired }: UseLikeProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  // Check if current user already liked on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (data) setLiked(true);
    })();
  }, [courseId, user]);

  const toggleLike = useCallback(async () => {
    if (loading) return;
    if (!user) { onLoginRequired?.(); return; }
    if (ownerId && user.id === ownerId) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((prev) => newLiked ? prev + 1 : prev - 1);
    setLoading(true);

    try {
      if (newLiked) {
        const { error } = await supabase.from("likes").insert({ user_id: user.id, course_id: courseId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("course_id", courseId);
        if (error) throw error;
      }
      await supabase.rpc("recount_course_likes", { p_course_id: courseId });
    } catch {
      setLiked(!newLiked);
      setLikeCount((prev) => newLiked ? prev - 1 : prev + 1);
    } finally {
      setLoading(false);
    }
  }, [courseId, liked, loading, onLoginRequired, user]);

  return { liked, likeCount, toggleLike, loading };
}
