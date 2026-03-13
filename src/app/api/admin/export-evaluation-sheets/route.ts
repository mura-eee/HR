import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// GET /api/admin/export-evaluation-sheets?periodId=xxx
// Exports all evaluations for a period as an Excel summary file
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodId = request.nextUrl.searchParams.get("periodId");

  const where: Record<string, unknown> = {};
  if (periodId) where.periodId = periodId;

  const evaluations = await prisma.evaluation.findMany({
    where,
    orderBy: [
      { period: { year: "desc" } },
      { employee: { employeeCode: "asc" } },
    ],
    include: {
      employee: {
        select: {
          employeeCode: true,
          lastName: true,
          firstName: true,
          department: { select: { name: true } },
          position: { select: { name: true } },
          grade: true,
          salaryStep: true,
          baseSalary: true,
        },
      },
      period: {
        select: { name: true, year: true, half: true },
      },
      firstEvaluator: { select: { lastName: true, firstName: true } },
      secondEvaluator: { select: { lastName: true, firstName: true } },
      competencyEvaluations: {
        include: { competencyItem: true },
        orderBy: { competencyItem: { sortOrder: "asc" } },
      },
      kpiGoals: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (evaluations.length === 0) {
    return NextResponse.json({ error: "評価データがありません" }, { status: 404 });
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────
  const summaryRows: (string | number | null)[][] = [
    [
      "社員コード", "氏名", "部署", "職位", "評価期間",
      "1次評価者", "2次評価者",
      "コンピテンシー点", "KPI点", "合計点", "ランク", "号棒増減",
    ],
  ];

  for (const ev of evaluations) {
    summaryRows.push([
      ev.employee.employeeCode,
      `${ev.employee.lastName} ${ev.employee.firstName}`,
      ev.employee.department?.name ?? "",
      ev.employee.position?.name ?? "",
      ev.period.name,
      ev.firstEvaluator
        ? `${ev.firstEvaluator.lastName} ${ev.firstEvaluator.firstName}`
        : "",
      ev.secondEvaluator
        ? `${ev.secondEvaluator.lastName} ${ev.secondEvaluator.firstName}`
        : "",
      ev.competencyScore ?? "",
      ev.kpiScore ?? "",
      ev.totalScore ?? "",
      ev.rank ?? "",
      ev.salaryStepChange ?? "",
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  // Column widths
  wsSummary["!cols"] = [
    { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 8 },
    { wch: 6 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "評価サマリー");

  // ── Sheet 2: Competency Detail ────────────────────────
  // Collect all unique competency item names in order
  const itemNames: string[] = [];
  for (const ev of evaluations) {
    for (const ce of ev.competencyEvaluations) {
      const n = ce.competencyItem.name;
      if (!itemNames.includes(n)) itemNames.push(n);
    }
  }

  const compHeader = [
    "社員コード", "氏名", "評価期間",
    ...itemNames.flatMap((n) => [`${n}(1次)`, `${n}(2次)`, `${n}(平均)`, `${n}(換算)`]),
    "コンピテンシー合計",
  ];

  const compRows: (string | number | null)[][] = [compHeader];
  for (const ev of evaluations) {
    const row: (string | number | null)[] = [
      ev.employee.employeeCode,
      `${ev.employee.lastName} ${ev.employee.firstName}`,
      ev.period.name,
    ];
    for (const name of itemNames) {
      const ce = ev.competencyEvaluations.find((c) => c.competencyItem.name === name);
      row.push(ce?.firstScore ?? "", ce?.secondScore ?? "", ce?.averageScore ?? "", ce?.convertedScore ?? "");
    }
    row.push(ev.competencyScore ?? "");
    compRows.push(row);
  }

  const wsComp = XLSX.utils.aoa_to_sheet(compRows);
  XLSX.utils.book_append_sheet(wb, wsComp, "コンピテンシー詳細");

  // ── Sheet 3: KPI Detail ───────────────────────────────
  const kpiRows: (string | number | null)[][] = [
    [
      "社員コード", "氏名", "評価期間",
      "KPI目標No", "目標タイトル", "詳細", "係数",
      "1次評価", "2次評価", "平均", "60点換算",
    ],
  ];

  for (const ev of evaluations) {
    if (ev.kpiGoals.length === 0) {
      kpiRows.push([
        ev.employee.employeeCode,
        `${ev.employee.lastName} ${ev.employee.firstName}`,
        ev.period.name,
        "", "", "", "", "", "", "", "",
      ]);
    } else {
      for (let i = 0; i < ev.kpiGoals.length; i++) {
        const kpi = ev.kpiGoals[i];
        kpiRows.push([
          ev.employee.employeeCode,
          `${ev.employee.lastName} ${ev.employee.firstName}`,
          ev.period.name,
          i + 1,
          kpi.title,
          kpi.detail ?? "",
          kpi.coefficient,
          kpi.firstScore ?? "",
          kpi.secondScore ?? "",
          kpi.averageScore ?? "",
          kpi.convertedScore ?? "",
        ]);
      }
    }
  }

  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  wsKpi["!cols"] = [
    { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 30 },
    { wch: 40 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsKpi, "KPI詳細");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const periodLabel = evaluations[0]?.period.name ?? "全期間";
  const filename = encodeURIComponent(`評価データ_${periodLabel}.xlsx`);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
