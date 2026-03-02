import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getRankFromScore,
  calculateAverageScore,
  calculateConvertedScore,
} from "@/lib/evaluation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          lastName: true,
          firstName: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          grade: true,
          salaryStep: true,
          baseSalary: true,
        },
      },
      period: true,
      firstEvaluator: {
        select: { id: true, lastName: true, firstName: true },
      },
      secondEvaluator: {
        select: { id: true, lastName: true, firstName: true },
      },
      competencyEvaluations: {
        include: {
          competencyItem: true,
        },
        orderBy: {
          competencyItem: { sortOrder: "asc" },
        },
      },
      kpiGoals: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!evaluation) {
    return NextResponse.json(
      { error: "評価が見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json(evaluation);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      status,
      firstEvaluatorId,
      secondEvaluatorId,
      competencyEvaluations,
      kpiGoals,
      addKpiGoal,
      removeKpiGoalId,
    } = body;

    // Handle adding a new KPI goal
    if (addKpiGoal) {
      const existingGoals = await prisma.kpiGoal.findMany({
        where: { evaluationId: id },
        orderBy: { sortOrder: "desc" },
      });
      const nextOrder = existingGoals.length > 0 ? existingGoals[0].sortOrder + 1 : 0;

      const newGoal = await prisma.kpiGoal.create({
        data: {
          evaluationId: id,
          title: addKpiGoal.title || "新しい目標",
          detail: addKpiGoal.detail || "",
          criteria: addKpiGoal.criteria || "",
          coefficient: addKpiGoal.coefficient || 3,
          level1Text: addKpiGoal.level1Text || "",
          level2Text: addKpiGoal.level2Text || "",
          level3Text: addKpiGoal.level3Text || "",
          level4Text: addKpiGoal.level4Text || "",
          level5Text: addKpiGoal.level5Text || "",
          sortOrder: nextOrder,
        },
      });

      return NextResponse.json(newGoal);
    }

    // Handle removing a KPI goal
    if (removeKpiGoalId) {
      await prisma.kpiGoal.delete({
        where: { id: removeKpiGoalId },
      });

      // Recalculate totals after removing
      await recalculateEvaluationScores(id);

      const updated = await getFullEvaluation(id);
      return NextResponse.json(updated);
    }

    // Update competency evaluations
    if (competencyEvaluations && Array.isArray(competencyEvaluations)) {
      for (const ce of competencyEvaluations) {
        const avg = calculateAverageScore(ce.firstScore ?? null, ce.secondScore ?? null);
        const item = await prisma.competencyItem.findUnique({
          where: { id: ce.competencyItemId },
        });
        const converted = item
          ? calculateConvertedScore(avg, item.coefficient)
          : null;

        await prisma.competencyEvaluation.update({
          where: { id: ce.id },
          data: {
            firstScore: ce.firstScore ?? undefined,
            secondScore: ce.secondScore ?? undefined,
            firstComment: ce.firstComment ?? undefined,
            secondComment: ce.secondComment ?? undefined,
            averageScore: avg,
            convertedScore: converted,
          },
        });
      }
    }

    // Update KPI goals
    if (kpiGoals && Array.isArray(kpiGoals)) {
      for (const kpi of kpiGoals) {
        const avg = calculateAverageScore(kpi.firstScore ?? null, kpi.secondScore ?? null);
        const converted = calculateConvertedScore(avg, kpi.coefficient ?? 3);

        await prisma.kpiGoal.update({
          where: { id: kpi.id },
          data: {
            title: kpi.title ?? undefined,
            detail: kpi.detail ?? undefined,
            criteria: kpi.criteria ?? undefined,
            coefficient: kpi.coefficient ?? undefined,
            level1Text: kpi.level1Text ?? undefined,
            level2Text: kpi.level2Text ?? undefined,
            level3Text: kpi.level3Text ?? undefined,
            level4Text: kpi.level4Text ?? undefined,
            level5Text: kpi.level5Text ?? undefined,
            selfComment: kpi.selfComment ?? undefined,
            firstComment: kpi.firstComment ?? undefined,
            secondComment: kpi.secondComment ?? undefined,
            firstScore: kpi.firstScore ?? undefined,
            secondScore: kpi.secondScore ?? undefined,
            averageScore: avg,
            convertedScore: converted,
          },
        });
      }
    }

    // Recalculate totals
    await recalculateEvaluationScores(id);

    // Update status and evaluator assignments
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (firstEvaluatorId !== undefined) updateData.firstEvaluatorId = firstEvaluatorId;
    if (secondEvaluatorId !== undefined) updateData.secondEvaluatorId = secondEvaluatorId;

    if (Object.keys(updateData).length > 0) {
      await prisma.evaluation.update({
        where: { id },
        data: updateData,
      });
    }

    const updated = await getFullEvaluation(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update evaluation:", error);
    return NextResponse.json(
      { error: "評価の更新に失敗しました" },
      { status: 500 }
    );
  }
}

async function recalculateEvaluationScores(evaluationId: string) {
  const competencyEvals = await prisma.competencyEvaluation.findMany({
    where: { evaluationId },
  });

  const kpiGoals = await prisma.kpiGoal.findMany({
    where: { evaluationId },
  });

  const competencyScore = competencyEvals.reduce(
    (sum, ce) => sum + (ce.convertedScore ?? 0),
    0
  );

  const kpiScore = kpiGoals.reduce(
    (sum, kpi) => sum + (kpi.convertedScore ?? 0),
    0
  );

  const totalScore = Math.round((competencyScore + kpiScore) * 10) / 10;
  const rankInfo = getRankFromScore(totalScore);

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      competencyScore: Math.round(competencyScore * 10) / 10,
      kpiScore: Math.round(kpiScore * 10) / 10,
      totalScore,
      rank: rankInfo.rank,
      salaryStepChange: rankInfo.salaryStepChange,
    },
  });
}

async function getFullEvaluation(id: string) {
  return prisma.evaluation.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          lastName: true,
          firstName: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          grade: true,
          salaryStep: true,
          baseSalary: true,
        },
      },
      period: true,
      firstEvaluator: {
        select: { id: true, lastName: true, firstName: true },
      },
      secondEvaluator: {
        select: { id: true, lastName: true, firstName: true },
      },
      competencyEvaluations: {
        include: { competencyItem: true },
        orderBy: { competencyItem: { sortOrder: "asc" } },
      },
      kpiGoals: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
