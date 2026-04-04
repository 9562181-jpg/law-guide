import { NextResponse } from "next/server";
import { fetchLawArticle } from "@/lib/law-api";

/**
 * GET /api/law?name={법령명}&article={조문번호}
 * 법제처 API 프록시. 단일 법령 조문을 조회한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lawName = searchParams.get("name");
  const articleNumber = searchParams.get("article");

  if (!lawName || !articleNumber) {
    return NextResponse.json(
      { error: "name과 article 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const article = await fetchLawArticle(lawName, articleNumber);

    if (!article) {
      return NextResponse.json(
        { error: "법령 조회 실패 — 직접 확인 필요" },
        { status: 502 }
      );
    }

    return NextResponse.json(article);
  } catch (err) {
    console.error("[law] 법령 조회 오류:", err);
    return NextResponse.json(
      { error: "법령 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
