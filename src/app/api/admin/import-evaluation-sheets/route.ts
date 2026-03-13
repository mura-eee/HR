import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { getRankFromScore } from "@/lib/evaluation";

const EVAL_DIR = "C:/Users/村井俊介/Desktop/HR２/評価シート";

// Convert Japanese era date string like "令和 ７ 年 ３ 月 ２１ 日" to Date
function parseJapaneseDate(str: string): Date | null {
  if (!str) return null;
  // Normalize full-width digits to ASCII
  const normalized = str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, " ")
    .trim();
  const m = normalized.match(/令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/);
  if (!m) return null;
  const year = 2018 + parseInt(m[1]); // 令和1年 = 2019年
  const month = parseInt(m[2]);
  const day = parseInt(m[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

// Competency item data rows (1-based row numbers)
const COMPETENCY_ROWS = [14, 19, 24, 29, 34];
// KPI item data rows
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!fs.existsSync(EVAL_DIR)) {
    return NextResponse.json(
      { error: `評価シートディレクトリが見つかりません: ${EVAL_DIR}` },
      { status: 400 }
    );
  }

  const files = fs
    .readdirSync(EVAL_DIR)
    .filter((f) => f.endsWith(".xlsx"))
    .sort();

  const results: {
    file: string;
    status: "success" | "error";
    message?: string;
  }[] = [];

  for (const filename of files) {
    try {
      // Extract employee code from filename like "（0006_永谷香代子）"
      const codeMatch = filename.match(/（(\d+)_/);
      if (!codeMatch) {
        results.push({
          file: filename,
          status: "error",
          message: "ファイル名から社員コードを取得できません",
        });
        continue;
      }
      const employeeCode = codeMatch[1];

      const employee = await prisma.employee.findUnique({
        where: { employeeCode },
      });
      if (!employee) {
        results.push({
          file: filename,
          status: "error",
          message: `社員コード「${employeeCode}」が存在しません`,
        });
        continue;
      }

      const wb = XLSX.readFile(path.join(EVAL_DIR, filename));
      const ws = wb.Sheets[wb.SheetNames[0]];

      // --- Evaluation Period ---
      const assessmentStart = parseJapaneseDate(cellStr(ws, 3, 3));
      const assessmentEnd = parseJapaneseDate(cellStr(ws, 3, 6));
      const evaluationStart = parseJapaneseDate(cellStr(ws, 3, 10));
      const evaluationEnd = parseJapaneseDate(cellStr(ws, 3, 13));

      if (!assessmentStart || !assessmentEnd) {
        results.push({
          file: filename,
          status: "error",
          message: "査定期間の日付を解析できません",
        });
        continue;
      }

      const year = assessmentStart.getUTCFullYear();
      // Determine half: FIRST=上期(ends Sep or earlier), SECOND=下期, ANNUAL=通期
      const endMonth = assessmentEnd.getUTCMonth(); // 0-indexed
      const spanMonths =
        (assessmentEnd.getUTCFullYear() - assessmentStart.getUTCFullYear()) * 12 +
        (assessmentEnd.getUTCMonth() - assessmentStart.getUTCMonth());
      let half: string;
      let halfLabel: string;
      if (spanMonths >= 11) {
        half = "ANNUAL";
        halfLabel = "通期";
      } else if (endMonth <= 8) {
        // ends in Jan-Sep → 上期
        half = "FIRST";
        halfLabel = "上期";
      } else {
        half = "SECOND";
        halfLabel = "下期";
      }
      const periodName = `${year}年度 ${halfLabel}`;

      let period = await prisma.evaluationPeriod.findFirst({
        where: {
          assessmentStartDate: assessmentStart,
          assessmentEndDate: assessmentEnd,
        },
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

      // --- Evaluators ---
      const findEvaluator = async (name: string) => {
        if (!name) return null;
        // Names like "鈴木　秀典" (full-width space) or "鈴木 秀典"
        const parts = name.replace(/[\s　]+/g, " ").split(" ");
        if (parts.length < 2) return null;
        return prisma.employee.findFirst({
          where: { lastName: parts[0], firstName: parts[1] },
        });
      };
      const firstEvaluator = await findEvaluator(cellStr(ws, 5, 3));
      const secondEvaluator = await findEvaluator(cellStr(ws, 6, 3));

      // --- Competency Data ---
      const competencyData: {
        name: string;
        category: string;
        description: string;
        coefficient: number;
        level1Text: string;
        level2Text: string;
        level3Text: string;
        level4Text: string;
        firstScore: number | null;
        secondScore: number | null;
        averageScore: number | null;
        convertedScore: number | null;
        sortOrder: number;
      }[] = [];

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

      // --- KPI Data ---
      const kpiData: {
        title: string;
        detail: string;
        criteria: string;
        coefficient: number;
        level1Text: string;
        level2Text: string;
        level3Text: string;
        level4Text: string;
        level5Text: string;
        firstScore: number | null;
        secondScore: number | null;
        averageScore: number | null;
        convertedScore: number | null;
        sortOrder: number;
      }[] = [];

      for (let i = 0; i < KPI_ROWS.length; i++) {
        const row = KPI_ROWS[i];
        const title = cellStr(ws, row, 1);
        const firstScore = cellNum(ws, row, 30);
        const secondScore = cellNum(ws, row, 31);
        const averageScore = cellNum(ws, row, 32);
        const convertedScore = cellNum(ws, row, 33);

        // Skip row 66-style blank rows: no title AND converted score is 0
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
          firstScore,
          secondScore,
          averageScore,
          convertedScore,
          sortOrder: i,
        });
      }

      // --- Totals ---
      const compScore = competencyData.reduce(
        (s, c) => s + (c.convertedScore ?? 0),
        0
      );
      const kpiScore = kpiData.reduce(
        (s, k) => s + (k.convertedScore ?? 0),
        0
      );
      const totalScore = Math.round((compScore + kpiScore) * 10) / 10;
      const { rank, salaryStepChange } = getRankFromScore(totalScore);

      // --- Upsert Evaluation ---
      const evaluation = await prisma.evaluation.upsert({
        where: {
          employeeId_periodId: {
            employeeId: employee.id,
            periodId: period.id,
          },
        },
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

      // --- Upsert CompetencyItems + CompetencyEvaluations ---
      for (const cd of competencyData) {
        let item = await prisma.competencyItem.findFirst({
          where: { name: cd.name },
        });
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
          where: {
            evaluationId_competencyItemId: {
              evaluationId: evaluation.id,
              competencyItemId: item.id,
            },
          },
          update: {
            firstScore: cd.firstScore,
            secondScore: cd.secondScore,
            averageScore: cd.averageScore,
            convertedScore: cd.convertedScore,
          },
          create: {
            evaluationId: evaluation.id,
            competencyItemId: item.id,
            firstScore: cd.firstScore,
            secondScore: cd.secondScore,
            averageScore: cd.averageScore,
            convertedScore: cd.convertedScore,
          },
        });
      }

      // --- Replace KPI Goals ---
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

      results.push({ file: filename, status: "success" });
    } catch (err) {
      results.push({
        file: filename,
        status: "error",
        message: String(err),
      });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  return NextResponse.json({
    results,
    successCount,
    total: results.length,
  });
}
