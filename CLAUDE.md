# CLAUDE.md

## 프로젝트 개요

**Korea Police Law MCP Server** — 법제처 Open API 기반 경찰 법령 조회 MCP 서버.
Claude.ai 커스텀 커넥터로 등록하여 112 신고 처리 시 법령 할루시네이션 방지 용도.

분류·매뉴얼·서류 생성은 Claude.ai 구독으로 수행한다(이 레포에는 Anthropic API 직접 호출이 없다).

## 기술 스택

- Next.js 16 (App Router, Node.js runtime)
- `mcp-handler` (Vercel 공식 MCP 어댑터)
- `@modelcontextprotocol/sdk` (peer)
- `zod` 스키마 검증
- 법제처 Open API (1순위) / 공공데이터포털 (fallback)
- Vercel 배포

## 아키텍처

- `app/api/mcp/[transport]/route.ts` — MCP Streamable HTTP 엔드포인트 (`mcp-handler`)
- `lib/mcp/law-mcp-server.ts` — MCP tool 정의 (`registerLawTools`)
- `lib/law-api.ts` — 법제처 API 클라이언트 (XML 파싱, 캐싱 24h)
- `lib/law-map.ts` — 신고 유형별 법령 매핑 테이블
- `lib/types.ts` — 공유 타입 (`IncidentType`, `LawMapping`, `ParsedArticle` 등)

## MCP Tools

| Tool | 설명 |
|------|------|
| `list_incident_types` | 지원 신고 유형 + 관련 법령·서류 목록 반환 |
| `get_laws_for_incident` | 유형별 필수 법령 전체 조문 일괄 조회 |
| `get_law_article` | 법령명+조문번호로 단일 조문 조회 |
| `search_law_keyword` | 매핑 테이블 내 키워드 검색 |

## 환경변수

| Key | 용도 |
|-----|------|
| `LAW_API_OC` | 법제처 공동활용 인증키 (1순위) |
| `DATA_GO_KR_SERVICE_KEY` | 공공데이터포털 fallback |
| `MCP_AUTH_TOKEN` | MCP 접근 Bearer 토큰 (`openssl rand -hex 32`) |

## 개발·배포

```bash
npm run dev                          # 로컬 개발 (http://localhost:3000)
npx @modelcontextprotocol/inspector  # MCP 디버깅
npm run build && npm run lint        # 배포 전 검증
git push                             # Vercel 자동 배포
```

MCP endpoint URL: `/api/mcp/mcp` (로컬) / `https://<vercel-domain>/api/mcp/mcp` (프로덕션)

## 보안 원칙

- MCP endpoint는 `withMcpAuth`로 Bearer 토큰 인증 필수
- 반환 데이터는 공공 법령 텍스트만 (개인정보·피해자·피의자 정보 없음)
- Anthropic API 직접 호출 없음 (월 비용 $0 목표)
- `.env.local`은 `.gitignore`에 의해 제외

## 유지보수 규칙

- `lib/law-api.ts` API 호출 로직 수정 금지 (법제처 XML 구조 의존)
- `lib/law-map.ts` 매핑 데이터 수정 시 법령 조문 검증 필수
- 새 MCP tool 추가 시 `zod` 스키마로 입력 검증
- 커밋 메시지는 한국어, 컨벤션: `<type>(<scope>): <subject>`
