-- 코스 인당 10개 제한 (DB trigger로 동시성 보장)
-- Run in Supabase SQL Editor

create or replace function check_course_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role text;
  v_count integer;
begin
  -- 관리자는 제한 없음
  select role into v_role from profiles where id = NEW.user_id;
  if v_role = 'admin' then return NEW; end if;

  -- 현재 보유 중인 코스 수 (BEFORE INSERT라 자기 자신은 미포함)
  select count(*) into v_count from courses where user_id = NEW.user_id;
  if v_count >= 10 then
    raise exception 'COURSE_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_course_limit on courses;
create trigger enforce_course_limit
  before insert on courses
  for each row
  execute function check_course_limit();
