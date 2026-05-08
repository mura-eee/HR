import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Excelの列インデックス定数
const COL = {
  // コンピテンシー
  COMP_CATEGORY: 0,   // A: カテゴリ
  COMP_NAME: 2,       // C: 項目名
  COMP_LEVEL1: 10,    // K: レベル1テキスト
  COMP_LEVEL2: 13,    // N: レベル2テキスト
  COMP_LEVEL3: 16,    // Q: レベル3テキスト
  COMP_LEVEL4: 19,    // T: レベル4テキスト
  COMP_COMMENT1: 22,  // W: 1次コメント
  COMP_COMMENT2: 25,  // Z: 2次コメント
  COMP_SCORE1: 28,    // AC: 1次評価点数
  COMP_SCORE2: 29,    // AD: 2次評価点数

  // KPI
  KPI_TITLE: 0,       // A: 目標
  KPI_DETAIL: 3,      // D: 詳細
  KPI_CRITERIA: 6,    // G: 目標設定項目
  KPI_COEF: 9,        // J: 係数
  KPI_LEVEL1: 10,     // K: レベル1テキスト
  KPI_LEVEL2: 12,     // M: レベル2テキスト
  KPI_LEVEL3: 14,     // O: レベル3テキスト
  KPI_LEVEL4: 16,     // Q: レベル4テキスト
  KPI_LEVEL5: 18,     // S: レベル5テキスト
  KPI_SELF_COMMENT: 20, // U: 自己評価コメント
  KPI_COMMENT1: 23,   // X: 1次コメント
  KPI_COMMENT2: 26,   // AA: 2次コメント
  KPI_SCORE1: 29,     // AD: 1次評価点数
  KPI_SCORE2: 30,     // AE: 2次評価点数

  // 最終評価（行79 = index 78）
  RESULT_RANK: 16,        // Q79: 評価ランク
  RESULT_STEP_CHANGE: 17, // R79: 号棒増減
};

// 最終評価が入っている行（0-indexed）
const RESULT_ROW = 78;

function getCellValue(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  if (!cell || cell.v === undefined || cell.v === null) return "";
  return String(cell.v).trim();
}

function getCellNumber(ws: XLSX.WorkSheet, row: number, col: number): number | null {
  const val = getCellValue(ws, row, col);
  if (!val) return null;
  const num = parseInt(val);
  return isNaN(num) ? null : num;
}

// POST /api/evaluations/[id]/import-excel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id: evaluationId } = await params;

    // 評価データ取得（competencyEvaluations と kpiGoals を含む）
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        competencyEvaluations: {
          include: { competencyItem: true },
          orderBy: { competencyItem: { sortOrder: "asc" } },
        },
        kpiGoals: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "評価が見つかりません" }, { status: 404 });
    }

    // ファイル取得
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
    }

    // Excelパース
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // ======== コンピテンシー行の検出・インポート ========
    // カテゴリ列(A)に値があり、係数列(J)に数値がある行をコンピテンシー行とみなす
    // 期待される開始行: 14行目(0-indexed: 13)
    const COMP_START_ROW = 13;
    const COMP_END_ROW = 44; // KPI開始前まで

    const compRowsFromExcel: Array<{
      name: string;
      level1Text: string;
      level2Text: string;
      level3Text: string;
      level4Text: string;
      firstComment: string;
      secondComment: string;
      firstScore: number | null;
      secondScore: number | null;
    }> = [];

    for (let r = COMP_START_ROW; r <= COMP_END_ROW; r++) {
      const name = getCellValue(ws, r, COL.COMP_NAME);
      const coef = getCellValue(ws, r, COL.COMP_CATEGORY);
      // 係数列(J)に数値があり、項目名があればコンピテンシー行
      const coefJ = getCellNumber(ws, r, 9);
      if (!name || !coef || coefJ === null) continue;

      compRowsFromExcel.push({
        name,
        level1Text: getCellValue(ws, r, COL.COMP_LEVEL1),
        level2Text: getCellValue(ws, r, COL.COMP_LEVEL2),
        level3Text: getCellValue(ws, r, COL.COMP_LEVEL3),
        level4Text: getCellValue(ws, r, COL.COMP_LEVEL4),
        firstComment: getCellValue(ws, r, COL.COMP_COMMENT1),
        secondComment: getCellValue(ws, r, COL.COMP_COMMENT2),
        firstScore: getCellNumber(ws, r, COL.COMP_SCORE1),
        secondScore: getCellNumber(ws, r, COL.COMP_SCORE2),
      });
    }

    // DBのcompetencyEvaluationsと順番・名前でマッチング
    const compUpdates: Promise<unknown>[] = [];
    for (let i = 0; i < evaluation.competencyEvaluations.length; i++) {
      const ce = evaluation.competencyEvaluations[i];
      const excelRow = compRowsFromExcel[i]; // 順番でマッチ
      if (!excelRow) continue;

      const firstScore = excelRow.firstScore;
      const secondScore = excelRow.secondScore;
      const avg =
        firstScore !== null && secondScore !== null
          ? (firstScore + secondScore) / 2
          : firstScore !== null
          ? firstScore
          : secondScore !== null
          ? secondScore
          : null;
      const convertedScore =
        avg !== null ? Math.round(avg * ce.competencyItem.coefficient * 10) / 10 : null;

      compUpdates.push(
        prisma.competencyEvaluation.update({
          where: { id: ce.id },
          data: {
            level1Text: excelRow.level1Text || null,
            level2Text: excelRow.level2Text || null,
            level3Text: excelRow.level3Text || null,
            level4Text: excelRow.level4Text || null,
            firstComment: excelRow.firstComment || null,
            secondComment: excelRow.secondComment || null,
            firstScore,
            secondScore,
            averageScore: avg,
            convertedScore,
          },
        })
      );
    }

    // ======== KPI行の検出・インポート ========
    const KPI_START_ROW = 50; // 51行目(0-indexed: 50)
    const KPI_END_ROW = 75;

    const kpiRowsFromExcel: Array<{
      title: string;
      detail: string;
      criteria: string;
      coefficient: number;
      level1Text: string;
      level2Text: string;
      level3Text: string;
      level4Text: string;
      level5Text: string;
      selfComment: string;
      firstComment: string;
      secondComment: string;
      firstScore: number | null;
      secondScore: number | null;
    }> = [];

    for (let r = KPI_START_ROW; r <= KPI_END_ROW; r++) {
      const title = getCellValue(ws, r, COL.KPI_TITLE);
      const coef = getCellNumber(ws, r, COL.KPI_COEF);
      // 「計」行はスキップ
      if (!title || title === "計" || coef === null) continue;

      kpiRowsFromExcel.push({
        title,
        detail: getCellValue(ws, r, COL.KPI_DETAIL),
        criteria: getCellValue(ws, r, COL.KPI_CRITERIA),
        coefficient: coef,
        level1Text: getCellValue(ws, r, COL.KPI_LEVEL1),
        level2Text: getCellValue(ws, r, COL.KPI_LEVEL2),
        level3Text: getCellValue(ws, r, COL.KPI_LEVEL3),
        level4Text: getCellValue(ws, r, COL.KPI_LEVEL4),
        level5Text: getCellValue(ws, r, COL.KPI_LEVEL5),
        selfComment: getCellValue(ws, r, COL.KPI_SELF_COMMENT),
        firstComment: getCellValue(ws, r, COL.KPI_COMMENT1),
        secondComment: getCellValue(ws, r, COL.KPI_COMMENT2),
        firstScore: getCellNumber(ws, r, COL.KPI_SCORE1),
        secondScore: getCellNumber(ws, r, COL.KPI_SCORE2),
      });
    }

    // 既存KpiGoalsを削除して再作成
    await prisma.kpiGoal.deleteMany({ where: { evaluationId } });

    const kpiCreates = kpiRowsFromExcel.map((kpi, idx) => {
      const firstScore = kpi.firstScore;
      const secondScore = kpi.secondScore;
      const avg =
        firstScore !== null && secondScore !== null
          ? (firstScore + secondScore) / 2
          : firstScore !== null
          ? firstScore
          : secondScore !== null
          ? secondScore
          : null;
      const convertedScore =
        avg !== null ? Math.round(avg * kpi.coefficient * 10) / 10 : null;

      return prisma.kpiGoal.create({
        data: {
          evaluationId,
          title: kpi.title,
          detail: kpi.detail || null,
          criteria: kpi.criteria || null,
          coefficient: kpi.coefficient,
          level1Text: kpi.level1Text || null,
          level2Text: kpi.level2Text || null,
          level3Text: kpi.level3Text || null,
          level4Text: kpi.level4Text || null,
          level5Text: kpi.level5Text || null,
          selfComment: kpi.selfComment || null,
          firstComment: kpi.firstComment || null,
          secondComment: kpi.secondComment || null,
          firstScore,
          secondScore,
          averageScore: avg,
          convertedScore,
          sortOrder: idx,
        },
      });
    });

    // 全更新を実行
    await Promise.all([...compUpdates, ...kpiCreates]);

    return NextResponse.json({
      message: "インポートが完了しました",
      competencyCount: compUpdates.length,
      kpiCount: kpiCreates.length,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    return NextResponse.json(
      { error: "インポートに失敗しました: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
