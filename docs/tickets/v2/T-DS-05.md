---
id: T-DS-05
slug: routebook-design-direction-main
version: v2
title: "CTA radius 12px + 색상 sweep"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-direction-main.md§4
estimated_complexity: L1
risk_flags: [global-grep-sweep]
priority: P1
started_at: "2026-05-26T07:28:26Z"
completed_at: "2026-05-26T07:38:58Z"
duration_min: 8
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T07:21:31Z"
---

# T-DS-05 · CTA 버튼 radius + 색상 통일

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

Map.tsx 내 모든 primary CTA 버튼을 `--radius-md`(12px) + `--color-brand`(#ff385c)로 통일한다. 메뉴/필터 활성 배경 `#EBF5FF`(Montage blue-bg)를 `--color-brand-subtle`로 교체하고, 경유지 번호 마커의 `#ef4444`(Tailwind red-500)를 `--color-brand`로 교체한다. 브랜드 단색 원칙("Singular accent") 확립의 마지막 단계. 선행: T-DS-01(토큰).

## Approach

아래 순서로 `src/components/Map.tsx`를 수정한다.

**1. 경유지 마커 색 교체 (즉각 효과)**
`background: "#ef4444"` 또는 `backgroundColor: "#ef4444"` grep → `var(--color-brand)`로 교체. 출발 마커 `#10b981`은 "Green = Go" UX semantic으로 유지.

**2. 메뉴/필터 active 배경 교체 (브랜드 훼손 제거)**
`background: "#EBF5FF"` grep → `var(--color-brand-subtle)` 교체. 텍스트 색도 `#0066FF`/`#1d4ed8` 계열이면 `var(--color-brand)`로 교체.

**3. Primary CTA 버튼 radius 통일**
`borderRadius: 10`, `borderRadius: 8` 혼재 상태를 `"var(--radius-md)"` (12px, Q5 확정)로 통일. "루트북 추가하기", "자세히 보기", 확인/저장 버튼 등 사용자 액션 유도 버튼 대상.

**4. `#ff385c` 하드코딩 → 토큰 참조**
`color: "#ff385c"`, `background: "#ff385c"` 잔여 하드코딩 → `var(--color-brand)`로 교체.

Map.tsx 이외 컴포넌트에서 동일 패턴 발견 시 같이 처리(범위 확장 허용).

## Acceptance

- [ ] `grep -r '#ef4444' src/` 결과 0건
- [ ] `grep -r '#EBF5FF' src/` 결과 0건
- [ ] `grep -r '#0066FF' src/components/` 결과 0건 (info semantic 사용처 `--color-info`로 처리)
- [ ] 코스 만들기 모드의 경유지 번호 마커가 `#ff385c` 계열(brand red)로 표시됨
- [ ] 메뉴/필터 활성 배경이 연한 분홍 tint(`rgba(255,56,92,0.08)`)로 표시됨 (파란 배경 아님)
- [ ] Primary CTA 버튼들이 12px 반경으로 표시됨
- [ ] `npx tsc --noEmit` 에러 없음

## Out of scope

- `--color-info: #428bff` GPS 아이콘/locate 버튼 — 유지 (Q2 결정)
- `#10b981` 출발 마커 — 유지 (UX semantic)
- `CoursePlayer.tsx` dark cinematic 색상 — 의도적 분리 유지
- 태그/배지 border 색 (globals.css 토큰 적용 시 자동 반영 기대)

## Notes / risks

- `#0066FF`가 GPS/locate 목적인지 카테고리 텍스트 목적인지 용도 구분 필요. GPS/locate → `var(--color-info)` 유지, 카테고리 텍스트 → `var(--color-text-secondary)` 또는 `var(--color-brand)` 교체.
- `borderRadius` 값이 숫자(10)인지 문자열("10px")인지 혼재할 수 있음 — 모두 `"var(--radius-md)"` 문자열로 통일.
- 롤백: 이 티켓은 색상/반경만 건드리므로 기능 회귀 없음. 시각 확인만으로 충분.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-direction-main.md§4 |
| 2026-05-26 07:38Z | pdt-developer | sonnet/medium | impl | 9 files swept: ef4444×2 EBF5FF×2 0066FF×7 ff385c→var (Mapbox GL gets BRAND_COLOR const); radius-md ×2 CTA; tsc clean |
| 2026-05-26 07:56Z | pdt-developer | haiku/low | hotfix | regression fix: BRAND_COLOR const value `var(--color-brand)` → `#ff385c` (Mapbox GL paint cannot resolve CSS vars) |
| 2026-05-26 08:00Z | pdt-developer | haiku/low | hotfix | CoursePlayer createCarMarkerEl SVG stroke/arrow var(--color-info) → #428bff literal (innerHTML SVG attr cross-browser safety) |
| 2026-05-26 08:00Z | pdt-developer | haiku/low | hotfix | Map.tsx:1550 temp marker SVG fill var(--color-brand) → #ff385c literal |
