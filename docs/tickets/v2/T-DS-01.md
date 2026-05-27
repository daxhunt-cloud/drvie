---
id: T-DS-01
slug: routebook-design-direction-main
version: v2
title: "globals.css 토큰 전면 교체"
status: done
stage: phase3_ticket_spec
assignee: pdt-developer
source_spec: design-direction-main.md§3
estimated_complexity: L1
risk_flags: [tokens,baseline-for-all]
priority: P1
started_at: "2026-05-26T07:21:56Z"
completed_at: "2026-05-26T07:25:26Z"
duration_min: 3
routing: { model: sonnet, effort: medium }
created_at: "2026-05-26T07:21:31Z"
---

# T-DS-01 · globals.css 토큰 전면 교체

> status: done · stage: phase3_complete · assignee: pdt-developer
> (mirrored — PO updates on lifecycle change)

## Request

`src/app/globals.css`의 기존 Montage 디자인 시스템 `:root` 블록을 `docs/prd/design-direction-main.md §3`의 "Routebook Design System Tokens v1.0" 블록으로 전면 교체한다. `--primary:#0066FF`, `--label-normal`, `--bg-normal` 등 Montage 토큰은 전부 삭제. 이 티켓은 T-DS-02~T-DS-05, T-IA-01 전체의 전제 조건이며 가장 먼저 완료되어야 한다.

## Approach

`src/app/globals.css`에서 `:root { ... }` 블록 전체를 식별한 후 `design-direction-main.md §3`의 CSS 블록으로 그대로 교체한다. 교체 전 `design-direction-main.md §3` 하위 "기존 Montage 토큰과의 매핑" 표를 참조해 삭제 항목과 신규 항목을 대조 확인한다.

`:root` 블록 이외의 선언은 보존한다:
- `@keyframes skeletonPulse` — 기존 선언 유지 (T-DS-03 skeleton에서 사용)
- `.mapboxgl-ctrl-compass` 등 Mapbox inject CSS — 유지
- Tailwind `@base`, `@components`, `@utilities` 레이어 선언 — 유지
- `body`, `html` 기본 스타일 — 유지

교체 완료 후 `npm run dev`로 앱 기동 확인. 색상 값이 유사하므로 외관 변화가 크지 않아야 한다.

## Acceptance

- [ ] `src/app/globals.css`의 `:root` 블록이 `design-direction-main.md §3` 내용과 일치한다
- [ ] `grep -r '\-\-primary' src/` 결과 0건 (신규 토큰명 제외)
- [ ] `grep -r '\-\-label-normal' src/` 결과 0건
- [ ] `grep -r '\-\-bg-normal' src/` 결과 0건
- [ ] `@keyframes skeletonPulse`, Mapbox CSS 등 `:root` 외 선언 보존 확인
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] `npm run dev` 기동 후 /map 시각 크게 이상 없음

## Out of scope

- Map.tsx inline style의 `var()` 변수 참조 전환 (T-DS-02, T-DS-05에서 처리)
- `src/app/globals.css` 이외 파일의 하드코딩 색상 교체
- Tailwind 컬러 팔레트 업데이트

## Notes / risks

- 기존 코드 일부가 `var(--primary)` 또는 `var(--label-normal)`을 직접 참조할 수 있음 → 교체 전 전체 grep으로 참조처 확인 후 처리 (발견 시 이 티켓 내에서 해결하거나 T-DS-05에 위임).
- `--radius-sm`, `--radius-md`, `--radius-lg`는 기존과 동일한 값이므로 반경 기반 시각 회귀 없음.
- 롤백: 교체 전 기존 `:root` 블록을 별도 브랜치 또는 주석으로 보존해 두면 빠른 복원 가능.

## Persona Activity
<!-- PO appends -->
| 2026-05-26 07:21Z | pdt-designer | sonnet/high | spec | ticket body authored from design-direction-main.md§3 |
| 2026-05-26 07:25Z | pdt-developer | sonnet/medium | impl | :root 블록 전면 교체 + 6파일 소비자 동기화 (layout/not-found/error/Onboarding×3); grep clean; tsc clean |
