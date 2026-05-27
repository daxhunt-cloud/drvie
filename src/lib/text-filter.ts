// 금칙어 리스트 — 욕설, 비속어, 외설적 표현
const BANNED_WORDS = [
  // 한국어 욕설/비속어
  "시발", "씨발", "시bal", "씨bal", "ㅅㅂ", "ㅆㅂ", "시바", "씨바",
  "개새끼", "개새기", "개색끼", "개색기", "개세끼", "ㄱㅅㄲ",
  "병신", "ㅂㅅ", "병시", "byungsin",
  "지랄", "ㅈㄹ", "지럴",
  "좆", "좃", "ㅈㅇ",
  "니미", "니엄마", "느금마", "느금", "니애미",
  "미친놈", "미친년", "미친새끼", "ㅁㅊ",
  "꺼져", "닥쳐", "죽어",
  "걸레", "창녀", "창남",
  "씹", "ㅆ", "보지", "자지",
  "새끼", "색끼", "ㅅㄲ",
  "엿먹어", "엿먹",
  "개같은", "개년", "개놈",
  "후장", "항문",
  "성기", "음경", "음부",
  "강간", "성폭행",
  "자살", "자해",
  // 변형 회피 대응
  "시1발", "씨1발", "s발", "si발",
  "ㅂ ㅅ", "ㅅ ㅂ", "ㅈ ㄹ",
  // 영어 욕설
  "fuck", "fck", "fuk", "f*ck",
  "shit", "sh1t", "s hit",
  "bitch", "b1tch",
  "asshole", "ass hole",
  "dick", "d1ck",
  "pussy", "pus5y",
  "nigger", "nigga",
  "bastard",
  "whore",
  "slut",
  "porn", "hentai",
];

// 공백/특수문자 제거 후 비교용 정규화
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_.*!@#$%^&()=+~`|\\/<>?,;:'"[\]{}]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s");
}

export function containsBannedWord(text: string): string | null {
  if (!text) return null;
  const normalized = normalize(text);
  for (const word of BANNED_WORDS) {
    if (normalized.includes(normalize(word))) {
      return word;
    }
  }
  return null;
}

export function isTextClean(text: string): boolean {
  return containsBannedWord(text) === null;
}
