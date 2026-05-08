import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Convert Japanese era date string like "令和 ７ 年 ３ 月 ２１ 日" to Date
function parseJapaneseDate(str: string): Date | null {
  if (!str) return null;
  const normalized = str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, " ")
    .trim();
  const m = normalized.match(/令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (!m) return null;
  const year = 2018 + parseInt(m[1]);
  const month = parseInt(m[2]);
  const day = parseInt(m[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

// 1始まりの行・列でセル値を取得
function cellStr(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const cell = ws[addr];
  if (!cell || cell.v === null || cell.v === undefined) return "";
  return String(cell.v).trim();
}

function cellNum(ws: XLSX.WorkSheet, row: number, col: number): number | null {
  const v = cellStr(ws, row, col);
  if (!v) return null;
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

// コンピテンシー行（1始まり）
const COMPETENCY_ROWS = [14, 19, 24, 29, 34];

// KPI行（1始まり）- 行が存在しない場合はスキップ
const KPI_ROWS = [51, 56, 61, 66, 71];

// 最終評価行（1始まり）
const RESULT_ROW = 79;

type ImportResult = { file: string; status: "success" | "error"; message?: string };

async function processSheet(ws: XLSX.WorkSheet, filename: string): Promise<ImportResult> {
  // 社員コード: Q4（1始まり row=4, col=17）
  let employeeCode: string | null = cellStr(ws, 4, 17) || null;
  if (!employeeCode) {
    const codeMatch = filename.match(/（(\d+)_/);
    employeeCode = codeMatch ? codeMatch[1] : null;
  }

  let employee = null;
  if (employeeCode) {
    employee = await prisma.employee.findUnique({ where: { employeeCode } });
  }
  // フォールバック: 氏名（C4）で検索
  if (!employee) {
    const rawName = cellStr(ws, 4, 3).replace(/[\s　]+/g, " ").trim();
    const parts = rawName.split(" ");
    if (parts.length >= 2) {
      employee = await prisma.employee.findFirst({
        where: { lastName: parts[0], firstName: parts[1] },
      });
    }
  }
  if (!employee) {
    return {
      file: filename,
      status: "error",
      message: employeeCode
        ? `社員コード「${employeeCode}」が存在しません`
        : "社員コード・氏名からの特定に失敗しました",
    };
  }

  // 査定期間・評価期間
  const assessmentStart = parseJapaneseDate(cellStr(ws, 3, 3));
  const assessmentEnd   = parseJapaneseDate(cellStr(ws, 3, 6));
  const evaluationStart = parseJapaneseDate(cellStr(ws, 3, 10));
  const evaluationEnd   = parseJapaneseDate(cellStr(ws, 3, 13));

  if (!assessmentStart || !assessmentEnd) {
    return { file: filename, status: "error", message: "査定期間の日付を解析できません" };
  }

  const year = assessmentStart.getUTCFullYear();
  const evalEnd   = evaluationEnd   ?? assessmentEnd;
  const evalStart = evaluationStart ?? assessmentStart;
  const evalSpanMonths =
    (evalEnd.getUTCFullYear() - evalStart.getUTCFullYear()) * 12 +
    (evalEnd.getUTCMonth() - evalStart.getUTCMonth());
  const endMonth = assessmentEnd.getUTCMonth();
  let half: string;
  let halfLabel: string;
  if (evalSpanMonths >= 11) {
    half = "ANNUAL"; halfLabel = "通期";
  } else if (endMonth <= 8) {
    half = "FIRST"; halfLabel = "上期";
  } else {
    half = "SECOND"; halfLabel = "下期";
  }
  const periodName = `${year}年度 ${halfLabel}`;

  let period = await prisma.evaluationPeriod.findFirst({
    where: { assessmentStartDate: assessmentStart, assessmentEndDate: assessmentEnd },
  });
  if (!period) {
    period = await prisma.evaluationPeriod.create({
      data: {
        name: periodName,
        assessmentStartDate: assessmentStart,
        assessmentEndDate: assessmentEnd,
        evaluationStartDate: evaluationStart ?? assessmentStart,
        evaluationEndDate:   evaluationEnd   ?? assessmentEnd,
        half,
        year,
        isActive: true,
      },
    });
  }

  // 評価者（C5: 1次, C6: 2次）
  const findEvaluator = async (name: string) => {
    if (!name) return null;
    const parts = name.replace(/[\s　]+/g, " ").split(" ");
    if (parts.length < 2) return null;
    return prisma.employee.findFirst({ where: { lastName: parts[0], firstName: parts[1] } });
  };
  const firstEvaluator  = await findEvaluator(cellStr(ws, 5, 3));
  const secondEvaluator = await findEvaluator(cellStr(ws, 6, 3));

  // ======== 最終評価ランク・号棒（Q79, R79）========
  const excelRank           = cellStr(ws, RESULT_ROW, 17) || null; // Q79
  const excelSalaryStepChange = cellNum(ws, RESULT_ROW, 18);       // R79

  // ======== コンピテンシーデータ読み取り ========
  // 列（1始まり）:
  //   A(1)=カテゴリ, C(3)=項目名, J(10)=係数
  //   K(11)=L1, N(14)=L2, Q(17)=L3, T(20)=L4
  //   W(23)=1次コメント, Z(26)=2次コメント
  //   AC(29)=1次点数, AD(30)=2次点数
  const competencyData = [];
  for (let i = 0; i < COMPETENCY_ROWS.length; i++) {
    const row  = COMPETENCY_ROWS[i];
    const name = cellStr(ws, row, 3);
    if (!name) continue;

    const firstScore  = cellNum(ws, row, 29);
    const secondScore = cellNum(ws, row, 30);
    const coefficient = cellNum(ws, row, 10) ?? 2;
    const avg =
      firstScore !== null && secondScore !== null
        ? (firstScore + secondScore) / 2
        : firstScore !== null ? firstScore
        : secondScore !== null ? secondScore
        : null;
    const convertedScore = avg !== null ? Math.round(avg * coefficient * 10) / 10 : null;

    competencyData.push({
      name,
      category:      cellStr(ws, row, 1),
      coefficient,
      level1Text:    cellStr(ws, row, 11),
      level2Text:    cellStr(ws, row, 14),
      level3Text:    cellStr(ws, row, 17),
      level4Text:    cellStr(ws, row, 20),
      firstComment:  cellStr(ws, row, 23), // W
      secondComment: cellStr(ws, row, 26), // Z
      firstScore,
      secondScore,
      averageScore:    avg,
      convertedScore,
      sortOrder: i,
    });
  }

  // ======== KPIデータ読み取り ========
  // 列（1始まり）:
  //   A(1)=目標, D(4)=詳細, G(7)=目標設定項目, J(10)=係数
  //   K(11)=L1, M(13)=L2, O(15)=L3, Q(17)=L4, S(19)=L5
  //   U(21)=自己コメント, X(24)=1次コメント, AA(27)=2次コメント
  //   AD(30)=1次点数, AE(31)=2次点数
  const kpiData = [];
  for (let i = 0; i < KPI_ROWS.length; i++) {
    const row   = KPI_ROWS[i];
    const title = cellStr(ws, row, 1);
    const coef  = cellNum(ws, row, 10);
    if (!title || title === "計" || coef === null) continue;

    const firstScore  = cellNum(ws, row, 30);
    const secondScore = cellNum(ws, row, 31);
    const avg =
      firstScore !== null && secondScore !== null
        ? (firstScore + secondScore) / 2
        : firstScore !== null ? firstScore
        : secondScore !== null ? secondScore
        : null;
    const convertedScore = avg !== null ? Math.round(avg * coef * 10) / 10 : null;

    kpiData.push({
      title,
      detail:        cellStr(ws, row, 4),
      criteria:      cellStr(ws, row, 7),
      coefficient:   coef,
      level1Text:    cellStr(ws, row, 11),
      level2Text:    cellStr(ws, row, 13),
      level3Text:    cellStr(ws, row, 15),
      level4Text:    cellStr(ws, row, 17),
      level5Text:    cellStr(ws, row, 19),
      selfComment:   cellStr(ws, row, 21), // U
      firstComment:  cellStr(ws, row, 24), // X
      secondComment: cellStr(ws, row, 27), // AA
      firstScore,
      secondScore,
      averageScore:    avg,
      convertedScore,
      sortOrder: i,
    });
  }

  const compScore  = competencyData.reduce((s, c) => s + (c.convertedScore ?? 0), 0);
  const kpiScore   = kpiData.reduce((s, k) => s + (k.convertedScore ?? 0), 0);
  const totalScore = Math.round((compScore + kpiScore) * 10) / 10;

  // Excelにランク・号棒があればそちら優先、なければ得点から算出
  const rank           = excelRank           ?? null;
  const salaryStepChange = excelSalaryStepChange ?? null;

  // ======== Evaluation upsert ========
  const evaluation = await prisma.evaluation.upsert({
    where: { employeeId_periodId: { employeeId: employee.id, periodId: period.id } },
    update: {
      firstEvaluatorId:  firstEvaluator?.id  ?? null,
      secondEvaluatorId: secondEvaluator?.id ?? null,
      status: "COMPLETED",
      competencyScore: Math.round(compScore  * 10) / 10,
      kpiScore:        Math.round(kpiScore   * 10) / 10,
      totalScore,
      rank,
      salaryStepChange,
    },
    create: {
      employeeId:        employee.id,
      periodId:          period.id,
      firstEvaluatorId:  firstEvaluator?.id  ?? null,
      secondEvaluatorId: secondEvaluator?.id ?? null,
      status: "COMPLETED",
      competencyScore: Math.round(compScore  * 10) / 10,
      kpiScore:        Math.round(kpiScore   * 10) / 10,
      totalScore,
      rank,
      salaryStepChange,
    },
  });

  // ======== CompetencyEvaluation upsert ========
  for (const cd of competencyData) {
    let item = await prisma.competencyItem.findFirst({ where: { name: cd.name } });
    if (!item) {
      item = await prisma.competencyItem.create({
        data: {
          category:    cd.category,
          name:        cd.name,
          coefficient: cd.coefficient,
          sortOrder:   cd.sortOrder,
          isActive:    true,
        },
      });
    }
    await prisma.competencyEvaluation.upsert({
      where: { evaluationId_competencyItemId: { evaluationId: evaluation.id, competencyItemId: item.id } },
      update: {
        // 個人別レベルテキスト（Excelから）
        level1Text:    cd.level1Text    || null,
        level2Text:    cd.level2Text    || null,
        level3Text:    cd.level3Text    || null,
        level4Text:    cd.level4Text    || null,
        // コメント
        firstComment:  cd.firstComment  || null,
        secondComment: cd.secondComment || null,
        // 点数
        firstScore:     cd.firstScore,
        secondScore:    cd.secondScore,
        averageScore:   cd.averageScore,
        convertedScore: cd.convertedScore,
      },
      create: {
        evaluationId:    evaluation.id,
        competencyItemId: item.id,
        level1Text:    cd.level1Text    || null,
        level2Text:    cd.level2Text    || null,
        level3Text:    cd.level3Text    || null,
        level4Text:    cd.level4Text    || null,
        firstComment:  cd.firstComment  || null,
        secondComment: cd.secondComment || null,
        firstScore:     cd.firstScore,
        secondScore:    cd.secondScore,
        averageScore:   cd.averageScore,
        convertedScore: cd.convertedScore,
      },
    });
  }

  // ======== KpiGoal 再作成 ========
  await prisma.kpiGoal.deleteMany({ where: { evaluationId: evaluation.id } });
  for (const kd of kpiData) {
    await prisma.kpiGoal.create({
      data: {
        evaluationId: evaluation.id,
        title:        kd.title,
        detail:       kd.detail   || null,
        criteria:     kd.criteria || null,
        coefficient:  kd.coefficient,
        level1Text:   kd.level1Text   || null,
        level2Text:   kd.level2Text   || null,
        level3Text:   kd.level3Text   || null,
        level4Text:   kd.level4Text   || null,
        level5Text:   kd.level5Text   || null,
        selfComment:  kd.selfComment  || null,
        firstComment: kd.firstComment || null,
        secondComment:kd.secondComment || null,
        firstScore:     kd.firstScore,
        secondScore:    kd.secondScore,
        averageScore:   kd.averageScore,
        convertedScore: kd.convertedScore,
        sortOrder:      kd.sortOrder,
      },
    });
  }

  return { file: filename, status: "success" };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: ImportResult[] = [];

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // ── ファイルアップロードモード（Vercel対応）──
      const formData    = await request.formData();
      const uploadedFiles = formData.getAll("files") as File[];

      if (uploadedFiles.length === 0) {
        return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
      }

      for (const file of uploadedFiles) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const wb = XLSX.read(buffer, { type: "buffer" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const result = await processSheet(ws, file.name);
          results.push(result);
        } catch (err) {
          results.push({ file: file.name, status: "error", message: String(err) });
        }
      }
    } else {
      // ── ローカルファイルシステムモード（開発環境）──
      const { existsSync, readdirSync, readFileSync } = await import("fs");
      const { join } = await import("path");
      const EVAL_DIR = "C:/Users/村井俊介/Desktop/HR２/評価シート";

      if (!existsSync(EVAL_DIR)) {
        return NextResponse.json(
          { error: "評価シートディレクトリが見つかりません。ファイルをアップロードして取込んでください。" },
          { status: 400 }
        );
      }

      const files = readdirSync(EVAL_DIR).filter((f) => f.endsWith(".xlsx")).sort();
      for (const filename of files) {
        try {
          const buffer = readFileSync(join(EVAL_DIR, filename));
          const wb = XLSX.read(buffer, { type: "buffer" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const result = await processSheet(ws, filename);
          results.push(result);
        } catch (err) {
          results.push({ file: filename, status: "error", message: String(err) });
        }
      }
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const successCount = results.filter((r) => r.status === "success").length;
  return NextResponse.json({ results, successCount, total: results.length });
}
