import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getRankFromScore } from "@/lib/evaluation";

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

const COMPETENCY_ROWS = [14, 19, 24, 29, 34];
const KPI_ROWS = [51, 56, 61, 66];

function cellVal(ws: XLSX.WorkSheet, row: number, col: number): unknown {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const cell = ws[addr];
  return cell ? cell.v : null;
}

function cellStr(ws: XLSX.WorkSheet, row: number, col: number): string {
  const v = cellVal(ws, row, col);
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cellNum(ws: XLSX.WorkSheet, row: number, col: number): number | null {
  const v = cellVal(ws, row, col);
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

type ImportResult = { file: string; status: "success" | "error"; message?: string };

async function processSheet(ws: XLSX.WorkSheet, filename: string): Promise<ImportResult> {
  // 1st priority: read employee code from cell Q4 (designated cell in sheet)
  // 2nd priority: extract from filename pattern （XXXX_name）
  // 3rd priority: look up by employee name in cell C4
  let employeeCode: string | null = cellStr(ws, 4, 17) || null; // Q4
  if (!employeeCode) {
    const codeMatch = filename.match(/（(\d+)_/);
    employeeCode = codeMatch ? codeMatch[1] : null;
  }

  let employee = null;
  if (employeeCode) {
    employee = await prisma.employee.findUnique({ where: { employeeCode } });
  }
  // Fallback: look up by full name (lastName + firstName)
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

  const assessmentStart = parseJapaneseDate(cellStr(ws, 3, 3));
  const assessmentEnd = parseJapaneseDate(cellStr(ws, 3, 6));
  const evaluationStart = parseJapaneseDate(cellStr(ws, 3, 10));
  const evaluationEnd = parseJapaneseDate(cellStr(ws, 3, 13));

  if (!assessmentStart || !assessmentEnd) {
    return { file: filename, status: "error", message: "査定期間の日付を解析できません" };
  }

  const year = assessmentStart.getUTCFullYear();
  const evalEnd = evaluationEnd ?? assessmentEnd;
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
        evaluationEndDate: evaluationEnd ?? assessmentEnd,
        half,
        year,
        isActive: true,
      },
    });
  }

  const findEvaluator = async (name: string) => {
    if (!name) return null;
    const parts = name.replace(/[\s　]+/g, " ").split(" ");
    if (parts.length < 2) return null;
    return prisma.employee.findFirst({ where: { lastName: parts[0], firstName: parts[1] } });
  };
  const firstEvaluator = await findEvaluator(cellStr(ws, 5, 3));
  const secondEvaluator = await findEvaluator(cellStr(ws, 6, 3));

  const competencyData = [];
  for (let i = 0; i < COMPETENCY_ROWS.length; i++) {
    const row = COMPETENCY_ROWS[i];
    const name = cellStr(ws, row, 3);
    if (!name) continue;
    competencyData.push({
      name,
      category: cellStr(ws, row, 1),
      description: cellStr(ws, row, 6),
      coefficient: cellNum(ws, row, 10) ?? 2,
      level1Text: cellStr(ws, row, 11),
      level2Text: cellStr(ws, row, 14),
      level3Text: cellStr(ws, row, 17),
      level4Text: cellStr(ws, row, 20),
      firstScore: cellNum(ws, row, 29),
      secondScore: cellNum(ws, row, 30),
      averageScore: cellNum(ws, row, 31),
      convertedScore: cellNum(ws, row, 32),
      sortOrder: i,
    });
  }

  const kpiData = [];
  for (let i = 0; i < KPI_ROWS.length; i++) {
    const row = KPI_ROWS[i];
    const title = cellStr(ws, row, 1);
    const convertedScore = cellNum(ws, row, 33);
    if (!title && (convertedScore === null || convertedScore === 0)) continue;
    kpiData.push({
      title: title || `KPI目標 ${i + 1}`,
      detail: cellStr(ws, row, 4),
      criteria: cellStr(ws, row, 7),
      coefficient: cellNum(ws, row, 10) ?? 4,
      level1Text: cellStr(ws, row, 11),
      level2Text: cellStr(ws, row, 13),
      level3Text: cellStr(ws, row, 15),
      level4Text: cellStr(ws, row, 17),
      level5Text: cellStr(ws, row, 19),
      firstScore: cellNum(ws, row, 30),
      secondScore: cellNum(ws, row, 31),
      averageScore: cellNum(ws, row, 32),
      convertedScore,
      sortOrder: i,
    });
  }

  const compScore = competencyData.reduce((s, c) => s + (c.convertedScore ?? 0), 0);
  const kpiScore = kpiData.reduce((s, k) => s + (k.convertedScore ?? 0), 0);
  const totalScore = Math.round((compScore + kpiScore) * 10) / 10;
  const { rank, salaryStepChange } = getRankFromScore(totalScore);

  const evaluation = await prisma.evaluation.upsert({
    where: { employeeId_periodId: { employeeId: employee.id, periodId: period.id } },
    update: {
      firstEvaluatorId: firstEvaluator?.id ?? null,
      secondEvaluatorId: secondEvaluator?.id ?? null,
      status: "COMPLETED",
      competencyScore: Math.round(compScore * 10) / 10,
      kpiScore: Math.round(kpiScore * 10) / 10,
      totalScore,
      rank,
      salaryStepChange,
    },
    create: {
      employeeId: employee.id,
      periodId: period.id,
      firstEvaluatorId: firstEvaluator?.id ?? null,
      secondEvaluatorId: secondEvaluator?.id ?? null,
      status: "COMPLETED",
      competencyScore: Math.round(compScore * 10) / 10,
      kpiScore: Math.round(kpiScore * 10) / 10,
      totalScore,
      rank,
      salaryStepChange,
    },
  });

  for (const cd of competencyData) {
    let item = await prisma.competencyItem.findFirst({ where: { name: cd.name } });
    if (!item) {
      item = await prisma.competencyItem.create({
        data: {
          category: cd.category,
          name: cd.name,
          description: cd.description,
          coefficient: cd.coefficient,
          level1Text: cd.level1Text,
          level2Text: cd.level2Text,
          level3Text: cd.level3Text,
          level4Text: cd.level4Text,
          sortOrder: cd.sortOrder,
          isActive: true,
        },
      });
    }
    await prisma.competencyEvaluation.upsert({
      where: { evaluationId_competencyItemId: { evaluationId: evaluation.id, competencyItemId: item.id } },
      update: { firstScore: cd.firstScore, secondScore: cd.secondScore, averageScore: cd.averageScore, convertedScore: cd.convertedScore },
      create: { evaluationId: evaluation.id, competencyItemId: item.id, firstScore: cd.firstScore, secondScore: cd.secondScore, averageScore: cd.averageScore, convertedScore: cd.convertedScore },
    });
  }

  await prisma.kpiGoal.deleteMany({ where: { evaluationId: evaluation.id } });
  for (const kd of kpiData) {
    await prisma.kpiGoal.create({
      data: {
        evaluationId: evaluation.id,
        title: kd.title,
        detail: kd.detail,
        criteria: kd.criteria,
        coefficient: kd.coefficient,
        level1Text: kd.level1Text,
        level2Text: kd.level2Text,
        level3Text: kd.level3Text,
        level4Text: kd.level4Text,
        level5Text: kd.level5Text,
        sortOrder: kd.sortOrder,
        firstScore: kd.firstScore,
        secondScore: kd.secondScore,
        averageScore: kd.averageScore,
        convertedScore: kd.convertedScore,
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
      // ── File upload mode (works on Vercel) ──────────────────────
      const formData = await request.formData();
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
      // ── Local filesystem mode (development only) ─────────────────
      const { existsSync, readdirSync, readFileSync } = await import("fs");
      const { join } = await import("path");
      const EVAL_DIR = "C:/Users/村井俊介/Desktop/HR２/評価シート";

      if (!existsSync(EVAL_DIR)) {
        return NextResponse.json(
          { error: `評価シートディレクトリが見つかりません。ファイルをアップロードして取込んでください。` },
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
