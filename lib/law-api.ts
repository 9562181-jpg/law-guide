import { XMLParser } from "fast-xml-parser";
import type { IncidentType, ParsedArticle } from "./types";
import { LAW_MAP } from "./law-map";

const LAW_API_OC = process.env.LAW_API_OC ?? "";
const DATA_GO_KR_KEY = process.env.DATA_GO_KR_SERVICE_KEY ?? "";

const TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

/** 메모리 캐시 */
const cache = new Map<string, { data: ParsedArticle[]; expiry: number }>();

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => name === "조문단위" || name === "항" || name === "호",
});

/**
 * 법령명으로 법제처 API에서 법령 전체 XML을 가져온다.
 * 1순위: 법제처 공동활용 API
 * 2순위: 공공데이터포털 API (fallback)
 */
async function fetchLawXml(lawName: string): Promise<string | null> {
  // 1순위: 법제처 공동활용
  if (LAW_API_OC) {
    try {
      const url = new URL("https://www.law.go.kr/DRF/lawSearch.do");
      url.searchParams.set("OC", LAW_API_OC);
      url.searchParams.set("target", "law");
      url.searchParams.set("type", "XML");
      url.searchParams.set("query", lawName);
      url.searchParams.set("display", "20");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const searchRes = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!searchRes.ok) throw new Error(`법제처 검색 API ${searchRes.status}`);

      const searchXml = await searchRes.text();
      const searchParsed = xmlParser.parse(searchXml);

      const laws = searchParsed?.LawSearch?.law;
      if (!laws) throw new Error("검색 결과 없음");

      const lawArray = Array.isArray(laws) ? laws : [laws];
      const exactMatch = lawArray.find((l: Record<string, unknown>) => {
        const name = l?.법령명한글 ?? l?.LawNameKorean;
        return typeof name === "string" && name === lawName;
      });
      const lawData = exactMatch ?? lawArray[0];
      const mst = lawData?.법령일련번호 || lawData?.MST;

      if (!mst) throw new Error("법령 ID 추출 실패");

      // 법령 본문 조회
      const detailUrl = new URL("https://www.law.go.kr/DRF/lawService.do");
      detailUrl.searchParams.set("OC", LAW_API_OC);
      detailUrl.searchParams.set("target", "law");
      detailUrl.searchParams.set("MST", String(mst));
      detailUrl.searchParams.set("type", "XML");

      const detailController = new AbortController();
      const detailTimeoutId = setTimeout(() => detailController.abort(), TIMEOUT_MS);

      const detailRes = await fetch(detailUrl.toString(), { signal: detailController.signal });
      clearTimeout(detailTimeoutId);

      if (!detailRes.ok) throw new Error(`법제처 본문 API ${detailRes.status}`);
      return await detailRes.text();
    } catch (err) {
      console.warn(`[law-api] 법제처 1순위 실패 (${lawName}):`, err instanceof Error ? err.message : err);
    }
  }

  // 2순위: 공공데이터포털
  if (DATA_GO_KR_KEY) {
    try {
      const url = new URL("https://apis.data.go.kr/B190017/law/lawNm");
      url.searchParams.set("serviceKey", DATA_GO_KR_KEY);
      url.searchParams.set("lawNm", lawName);
      url.searchParams.set("numOfRows", "1");
      url.searchParams.set("type", "XML");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) return await res.text();
    } catch (err) {
      console.warn(`[law-api] 공공데이터포털 fallback 실패 (${lawName}):`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}

/**
 * XML에서 특정 조문들을 추출한다.
 * articleFilters: ["제5조", "제8조의2"] 형태의 조문번호 목록
 */
function extractArticles(
  xml: string,
  lawName: string,
  articleFilters: string[]
): ParsedArticle[] {
  try {
    const parsed = xmlParser.parse(xml);

    // 법제처 API XML 구조: 법령 > 조문 > 조문단위[]
    const law = parsed?.법령 || parsed?.LawService?.법령 || parsed?.law;
    if (!law) return [];

    const articlesNode = law?.조문?.조문단위;
    if (!articlesNode) return [];

    const articleList: ParsedArticle[] = [];
    const articles = Array.isArray(articlesNode) ? articlesNode : [articlesNode];

    // 필터에서 "제N조" 또는 "제N조의M" 형태만 추출 (예: "제331조의2")
    const filterNumbers = articleFilters.map((f) => {
      const match = f.match(/제\d+조(의\d+)?/);
      return match ? match[0] : f;
    });

    for (const article of articles) {
      // 편장절 제목("제25장 상해와 폭행의 죄" 등)은 제외
      if (article?.조문여부 === "전문") continue;

      const articleNum = article?.조문번호;
      const branchNum = article?.조문가지번호;
      if (articleNum === undefined || articleNum === null || articleNum === "") continue;

      const baseNum = String(articleNum).replace(/[^\d]/g, "");
      const articleKey = branchNum
        ? `제${baseNum}조의${String(branchNum).replace(/[^\d]/g, "")}`
        : `제${baseNum}조`;

      const isMatch = filterNumbers.includes(articleKey);

      if (!isMatch) continue;

      const parsedArticle: ParsedArticle = {
        lawName,
        articleNumber: articleKey,
        articleTitle: article?.조문제목 || "",
        content: article?.조문내용 || "",
      };

      // 항 파싱
      if (article?.항) {
        const paragraphs = Array.isArray(article.항) ? article.항 : [article.항];
        parsedArticle.paragraphs = paragraphs.map(
          (p: Record<string, unknown>, idx: number) => ({
            number: idx + 1,
            content: (p?.항내용 as string) || "",
            subparagraphs: Array.isArray(p?.호)
              ? (p.호 as Record<string, unknown>[]).map((h, hIdx) => ({
                  number: hIdx + 1,
                  content: (h?.호내용 as string) || "",
                }))
              : undefined,
          })
        );
      }

      articleList.push(parsedArticle);
    }

    return articleList;
  } catch (err) {
    console.warn(`[law-api] XML 파싱 실패 (${lawName}):`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * 특정 신고 유형에 필요한 모든 법령 조문을 일괄 조회한다.
 * 캐시 히트 시 즉시 반환, 미스 시 법제처 API 호출.
 */
export async function fetchLawsForIncident(
  incidentType: IncidentType
): Promise<ParsedArticle[]> {
  const cacheKey = `incident:${incidentType}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const mapping = LAW_MAP[incidentType];
  if (!mapping) return [];

  const results = await Promise.allSettled(
    mapping.laws.map(async (law) => {
      const lawCacheKey = `law:${law.name}`;
      const lawCached = cache.get(lawCacheKey);

      if (lawCached && lawCached.expiry > Date.now()) {
        return lawCached.data;
      }

      const xml = await fetchLawXml(law.name);
      if (!xml) return [];

      const articles = extractArticles(xml, law.name, law.articles);

      // 빈 결과는 일시 실패일 수 있으므로 캐시하지 않음
      if (articles.length > 0) {
        cache.set(lawCacheKey, { data: articles, expiry: Date.now() + CACHE_TTL_MS });
      }

      return articles;
    })
  );

  const allArticles = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // 신고 유형 단위 캐시 (빈 결과는 캐시하지 않음)
  if (allArticles.length > 0) {
    cache.set(cacheKey, { data: allArticles, expiry: Date.now() + CACHE_TTL_MS });
  }

  return allArticles;
}

/**
 * 단일 법령의 특정 조문을 조회한다.
 */
export async function fetchLawArticle(
  lawName: string,
  articleNumber: string
): Promise<ParsedArticle | null> {
  const xml = await fetchLawXml(lawName);
  if (!xml) return null;

  const articles = extractArticles(xml, lawName, [articleNumber]);
  return articles[0] ?? null;
}

/**
 * ParsedArticle 배열을 Claude 프롬프트용 텍스트로 포맷한다.
 */
export function formatLawContext(articles: ParsedArticle[]): string {
  if (articles.length === 0) return "[법령 조회 실패 — 직접 확인 필요]";

  return articles
    .map((a) => {
      let text = `## ${a.lawName} ${a.articleNumber}`;
      if (a.articleTitle) text += ` (${a.articleTitle})`;
      text += `\n${a.content}`;

      if (a.paragraphs) {
        for (const p of a.paragraphs) {
          text += `\n  ② ${p.number}항: ${p.content}`;
          if (p.subparagraphs) {
            for (const sp of p.subparagraphs) {
              text += `\n    ${sp.number}. ${sp.content}`;
            }
          }
        }
      }

      return text;
    })
    .join("\n\n");
}
