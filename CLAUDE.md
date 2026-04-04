# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**112 Police Assistant** — 경찰 112 신고 처리 보조 시스템.
신고 내용 입력 → 유형 분류 → 현장 매뉴얼 출력 → 법령 실시간 조회 → 서류 .docx 일괄 생성.

대상 사용자: 지구대·파출소 지역경찰 (순경~경위). 모바일(현장) + 데스크톱(서류) 환경.

## 기술 스택

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.x
- **AI:** Claude API (`claude-sonnet-4-6`) — 분류 + 매뉴얼 + 서류 작성
- **법령:** 법제처 Open API (1순위) / 공공데이터포털 API (fallback)
- **서류 생성:** `docx` npm 패키지 9.x → .docx 파일 생성
- **배포:** Vercel 또는 로컬

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npx tsc --noEmit     # 타입 체크
```

## 환경변수 (.env.local)

```
ANTHROPIC_API_KEY=sk-ant-...
LAW_API_OC=...                    # 법제처 공동활용 인증키
DATA_GO_KR_SERVICE_KEY=...        # 공공데이터포털 (fallback)
```

## 아키텍처

### 핵심 흐름

```
사용자 입력 → /api/classify (유형 분류 + 매뉴얼, SSE 스트리밍)
           → /api/generate-docs (처리 결과 입력 후 서류 세트 .docx 생성)
           → /api/law (법제처 API 프록시, 캐싱)
           → /api/chat (후속 질문, SSE 스트리밍)
```

### 디렉토리 구조

- `app/` — Next.js App Router 페이지 + API Routes
- `app/api/classify/` — 신고 분류 + 매뉴얼 (SSE)
- `app/api/generate-docs/` — 서류 생성
- `app/api/law/` — 법제처 API 프록시
- `app/api/chat/` — 추가 질문 (SSE)
- `lib/law-map.ts` — 신고 유형별 법령 매핑 테이블 (앱 내장, 법령 조문 내용은 API 실시간 호출)
- `lib/law-api.ts` — 법제처 API 클라이언트 (XML 파싱)
- `lib/claude-client.ts` — Claude API 래퍼
- `lib/docx-generator.ts` — .docx 생성 엔진
- `lib/document-templates/` — 서류별 docx 템플릿 (A~F + 압수경위서 + 공통 스타일)
- `lib/prompts/` — 시스템/분류/서류생성 프롬프트
- `lib/types.ts` — 공유 타입 정의
- `components/` — UI 컴포넌트

## 서류 세트 분기 로직 (핵심 비즈니스 규칙)

서류 코드: A(112종결내용), B(입건전조사보고서), C(발생보고서), D(현행범인체포서), E(긴급임시조치결정서), F(긴급응급조치결정서)

| 사안 유형 | 서류 세트 | 비고 |
|-----------|----------|------|
| 현장조치 종결 | A만 | |
| 타부서 인계 (일반) | A + C + B | +E(가폭) / +F(스토킹) |
| 타부서 인계 (절도) | A + C | B 불필요 |
| 현행범 체포 | A + D + B | C 생성 안 함, +E/F 가능 |
| 압수 발생 시 | 위 세트 + 압수경위서 | |

복합 사안 중첩 가능. 예: 가정폭력 + 현행범체포 → A + D + B + E

## 문체 규칙 (서류 생성 시 필수)

- **112종결내용(A):** 경어체, 끝맺음을 단어/명사로 종결. 인계 시 `~것으로, [부서명]에 인계함.`
- **보고서류(B~F, 압수경위서):** 서술어 종결 (`~하였다`, `~되었다`). 범죄사실 주어는 항상 `피혐의자는`.
- **구성요건 맺음말:** 절도→절취하였다, 폭행→폭행하였다, 상해→상해를 가하였다, 사기→편취하였다, 협박→협박하였다, 손괴→손괴하였다 등
- **일시 포맷:** `YYYY. M. D. HH:MM경` (점 뒤 한 칸)
- **금액:** `100,000원(금 일십만 원)` — 숫자 + 한글 병기
- **누락 정보:** `[입력 필요]`로 표시. 임의 추측 절대 금지
- **인적사항 미상:** `불상` 기재 + `(인상착의: [입력 필요])`
- **법적 단정 금지:** "구성요건 부합", "범죄 성립" 같은 판단 표현 사용 금지
- **면책 안내:** 모든 서류 하단에 AI 초안 면책 문구 삽입

## 법제처 API 연동

- 법령 매핑 테이블(`law-map.ts`)이 "어떤 조문을 호출할지" 결정 → API로 조문 본문만 실시간 호출
- API 응답은 XML → 파싱하여 조문 텍스트 추출
- 1순위: `open.law.go.kr` (OC 인증키), 2순위: `apis.data.go.kr` (serviceKey)
- 캐싱: 24시간 TTL
- API 장애 시 최종 fallback: `[법령 조회 실패 — 직접 확인 필요]`

## Claude API 사용

- 모델: `claude-sonnet-4-6` (분류 + 매뉴얼 + 서류 생성 모두)
- 분류/매뉴얼: 스트리밍(SSE), max_tokens 4096
- 서류 생성: max_tokens 8192, 서류 내용을 JSON으로 반환받아 docx 렌더링
- System Prompt에 법제처 API 조회 결과를 동적 삽입 (토큰 절감)

## 신고 유형 (IncidentType)

가정폭력, 폭행상해, 절도, 교통사고, 자살자해, 실종, 스토킹, 주거침입, 사기, 손괴, 모욕명예훼손, 기타

## 보안 원칙

- 데이터는 클라이언트 세션 내에서만 처리 (서버 DB 미저장)
- API 키는 서버사이드 전용 (클라이언트 노출 금지)
- 피의자·피해자 인적사항 서버 로그 기록 금지
