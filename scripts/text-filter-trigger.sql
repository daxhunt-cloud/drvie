-- T-002 extended · Server-side text filter
-- Protects: courses.title/description · comments.text · profiles.nickname
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Source: docs/tickets/v1/T-002.md (Approach extended per PO finding 2026-05-26)
-- ⚠️ src/lib/text-filter.ts BANNED_WORDS 와 동기화 유지

-- 1) 정규화 함수 (공통)
CREATE OR REPLACE FUNCTION normalize_for_filter(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $func$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(input),
            '[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]', '', 'g'),
          '0', 'o', 'g'),
        '1', 'i', 'g'),
      '3', 'e', 'g'),
    '4', 'a', 'g');
END;
$func$;

-- 2) 금칙어 검사 함수 (공통)
CREATE OR REPLACE FUNCTION contains_banned_word(input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $func$
DECLARE
  banned TEXT[] := ARRAY[
    '시발','씨발','시bal','씨bal','ㅅㅂ','ㅆㅂ','시바','씨바',
    '개새끼','개새기','개색끼','개색기','개세끼','ㄱㅅㄲ',
    '병신','ㅂㅅ','병시','byungsin',
    '지랄','ㅈㄹ','지럴',
    '좆','좃','ㅈㅇ',
    '니미','니엄마','느금마','느금','니애미',
    '미친놈','미친년','미친새끼','ㅁㅊ',
    '꺼져','닥쳐','죽어',
    '걸레','창녀','창남',
    '씹','ㅆ','보지','자지',
    '새끼','색끼','ㅅㄲ',
    '엿먹어','엿먹',
    '개같은','개년','개놈',
    '후장','항문','성기','음경','음부',
    '강간','성폭행','자살','자해',
    '시1발','씨1발','s발','si발',
    'fuck','fck','fuk','f*ck',
    'shit','sh1t','s hit',
    'bitch','b1tch','asshole','ass hole',
    'dick','d1ck','pussy','pus5y',
    'nigger','nigga','bastard','whore','slut','porn','hentai'
  ];
  word TEXT;
  normalized_input TEXT := normalize_for_filter(input);
BEGIN
  FOREACH word IN ARRAY banned LOOP
    IF position(normalize_for_filter(word) IN normalized_input) > 0 THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  RETURN FALSE;
END;
$func$;

-- 3) courses 트리거 함수
CREATE OR REPLACE FUNCTION enforce_text_filter_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF contains_banned_word(NEW.title) THEN
    RAISE EXCEPTION 'BANNED_WORD_IN_TITLE' USING errcode = 'P0002';
  END IF;
  IF NEW.description IS NOT NULL AND contains_banned_word(NEW.description) THEN
    RAISE EXCEPTION 'BANNED_WORD_IN_DESCRIPTION' USING errcode = 'P0002';
  END IF;
  RETURN NEW;
END;
$func$;

-- 4) comments 트리거 함수
CREATE OR REPLACE FUNCTION enforce_text_filter_comments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF contains_banned_word(NEW.text) THEN
    RAISE EXCEPTION 'BANNED_WORD_IN_COMMENT' USING errcode = 'P0002';
  END IF;
  RETURN NEW;
END;
$func$;

-- 5) profiles 트리거 함수
CREATE OR REPLACE FUNCTION enforce_text_filter_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF NEW.nickname IS NOT NULL AND contains_banned_word(NEW.nickname) THEN
    RAISE EXCEPTION 'BANNED_WORD_IN_NICKNAME' USING errcode = 'P0002';
  END IF;
  RETURN NEW;
END;
$func$;

-- 6) 트리거 등록 (재실행 안전 — DROP IF EXISTS)
DROP TRIGGER IF EXISTS enforce_text_filter ON courses;
CREATE TRIGGER enforce_text_filter
  BEFORE INSERT OR UPDATE OF title, description ON courses
  FOR EACH ROW EXECUTE FUNCTION enforce_text_filter_courses();

DROP TRIGGER IF EXISTS enforce_text_filter ON comments;
CREATE TRIGGER enforce_text_filter
  BEFORE INSERT OR UPDATE OF text ON comments
  FOR EACH ROW EXECUTE FUNCTION enforce_text_filter_comments();

DROP TRIGGER IF EXISTS enforce_text_filter ON profiles;
CREATE TRIGGER enforce_text_filter
  BEFORE INSERT OR UPDATE OF nickname ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_text_filter_profiles();
