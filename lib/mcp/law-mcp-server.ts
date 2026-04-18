import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchLawArticle,
  fetchLawsForIncident,
  formatLawContext,
} from "../law-api";
import { LAW_MAP } from "../law-map";
import type { IncidentType, ParsedArticle } from "../types";

const SUPPORTED_INCIDENT_TYPES = Object.keys(LAW_MAP) as IncidentType[];

const IncidentTypeEnum = z.enum(
  SUPPORTED_INCIDENT_TYPES as [IncidentType, ...IncidentType[]]
);

function renderArticle(article: ParsedArticle): string {
  let text = `## ${article.lawName} ${article.articleNumber}`;
  if (article.articleTitle) text += ` (${article.articleTitle})`;
  text += `\n\n${article.content}`;

  if (article.paragraphs) {
    for (const p of article.paragraphs) {
      text += `\n\n  ${p.number}항: ${p.content}`;
      if (p.subparagraphs) {
        for (const sp of p.subparagraphs) {
          text += `\n    ${sp.number}. ${sp.content}`;
        }
      }
    }
  }

  return text;
}

export function registerLawTools(server: McpServer): void {
  server.registerTool(
    "list_incident_types",
    {
      title: "지원 신고 유형 목록",
      description:
        "112 경찰 보조 시스템이 지원하는 신고 유형 목록을 반환한다. get_laws_for_incident 호출 전에 이 도구로 지원 유형을 확인한다.",
      inputSchema: {},
    },
    async () => {
      const types = SUPPORTED_INCIDENT_TYPES.map((type) => {
        const mapping = LAW_MAP[type];
        return {
          incidentType: type,
          laws: mapping?.laws.map((l) => l.name) ?? [],
          documents: mapping?.documents ?? [],
        };
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ supported: types }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_laws_for_incident",
    {
      title: "신고 유형별 필수 법령 조회",
      description:
        "특정 신고 유형에 필요한 모든 법령 조문을 법제처 Open API에서 실시간 조회한다. 할루시네이션 방지를 위해 반드시 이 도구로 원문을 확인한 후 법조를 인용하라.",
      inputSchema: {
        incidentType: IncidentTypeEnum,
        format: z.enum(["structured", "formatted"]).default("formatted"),
      },
    },
    async ({ incidentType, format }) => {
      const articles = await fetchLawsForIncident(incidentType);
      if (articles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `[법령 조회 실패 — ${incidentType}] 직접 확인 필요.`,
            },
          ],
          isError: true,
        };
      }
      const text =
        format === "structured"
          ? JSON.stringify({ incidentType, articles }, null, 2)
          : formatLawContext(articles);
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "get_law_article",
    {
      title: "특정 법령 조문 조회",
      description:
        "법령명과 조문번호로 단일 조문의 원문을 법제처 Open API에서 실시간 조회한다.",
      inputSchema: {
        lawName: z.string().describe("공식 법령명 (예: '형법')"),
        articleNumber: z
          .string()
          .describe("조문번호 (예: '제257조', '제8조의2')"),
      },
    },
    async ({ lawName, articleNumber }) => {
      const article = await fetchLawArticle(lawName, articleNumber);
      if (!article) {
        return {
          content: [
            {
              type: "text",
              text: `[법령 조회 실패] ${lawName} ${articleNumber}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: renderArticle(article) }],
      };
    }
  );

  server.registerTool(
    "search_law_keyword",
    {
      title: "법령 키워드 검색",
      description:
        "LAW_MAP에 매핑된 법령 목록에서 키워드로 법령명을 찾는다. 정확한 법령명을 모를 때 사용한다.",
      inputSchema: {
        keyword: z.string().describe("검색할 키워드 (예: '스토킹', '가정폭력')"),
      },
    },
    async ({ keyword }) => {
      const matches: string[] = [];
      for (const mapping of Object.values(LAW_MAP)) {
        for (const law of mapping?.laws ?? []) {
          if (law.name.includes(keyword) && !matches.includes(law.name)) {
            matches.push(law.name);
          }
        }
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ keyword, matches }, null, 2),
          },
        ],
      };
    }
  );
}
