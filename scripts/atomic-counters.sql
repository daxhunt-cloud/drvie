-- Atomic counter RPC functions
-- Run in Supabase SQL Editor

-- 좋아요 카운트를 likes 테이블에서 재계산 (race-free)
create or replace function recount_course_likes(p_course_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from likes where course_id = p_course_id;
  update courses set like_count = v_count where id = p_course_id;
  return v_count;
end;
$$;

-- 공유 카운트 atomic +1
create or replace function increment_share_count(p_course_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update courses
    set share_count = coalesce(share_count, 0) + 1
    where id = p_course_id
    returning share_count into v_count;
  return v_count;
end;
$$;

grant execute on function recount_course_likes(uuid) to anon, authenticated;
grant execute on function increment_share_count(uuid) to anon, authenticated;
