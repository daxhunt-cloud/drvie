import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseBookmarkProps {
  targetUserId: string;
  initialBookmarked: boolean;
  initialBookmarkCount: number;
  onLoginRequired?: () => void;
}

const useBookmark = ({
  targetUserId,
  initialBookmarked,
  initialBookmarkCount,
  onLoginRequired,
}: UseBookmarkProps) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount);
  const supabase = createClient();

  const toggleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { onLoginRequired?.(); return; }
    if (user.id === targetUserId) return;

    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    setBookmarkCount((prev) => newBookmarked ? prev + 1 : prev - 1);

    try {
      if (newBookmarked) {
        await supabase.from("bookmarks").insert({
          user_id: user.id,
          target_user_id: targetUserId,
        });
      } else {
        await supabase.from("bookmarks").delete()
          .eq("user_id", user.id)
          .eq("target_user_id", targetUserId);
      }
    } catch {
      setBookmarked(!newBookmarked);
      setBookmarkCount((prev) => newBookmarked ? prev - 1 : prev + 1);
    }
  };

  return { bookmarked, bookmarkCount, toggleBookmark };
};

export default useBookmark;
