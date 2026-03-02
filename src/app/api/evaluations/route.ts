import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const periodId = searchParams.get("periodId");
  const status = searchParams.get("status");
  const departmentId = searchParams.get("departmentId");
  const employeeId = searchParams.get("employeeId");

  const where: Record<string, unknown> = {};
  if (periodId) where.periodId = periodId;
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (departmentId) {
    where.employee = { departmentId };
  }

  const evaluations = await prisma.evaluation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
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
        },
      },
      period: {
        select: {
          id: true,
          name: true,
          year: true,
          half: true,
          assessmentStartDate: true,
          assessmentEndDate: true,
        },
      },
      firstEvaluator: {
        select: { id: true, lastName: true, firstName: true },
      },
      secondEvaluator: {
        select: { id: true, lastName: true, firstName: true },
      },
    },
  });

  return NextResponse.json(evaluations);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employeeId, periodId, firstEvaluatorId, secondEvaluatorId } = body;

    if (!employeeId || !periodId) {
      return NextResponse.json(
        { error: "社員と評価期間は必須です" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await prisma.evaluation.findUnique({
      where: {
        employeeId_periodId: { employeeId, periodId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この社員の同期間の評価は既に存在します" },
        { status: 409 }
      );
    }

    // Get employee's department to find matching competency items
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    });

    // Find competency items for the employee's department (or global ones)
    const competencyItems = await prisma.competencyItem.findMany({
      where: {
        isActive: true,
        OR: [
          { departmentId: employee?.departmentId },
          { departmentId: null },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });

    // Create evaluation with linked competency evaluations
    const evaluation = await prisma.evaluation.create({
      data: {
        employeeId,
        periodId,
        firstEvaluatorId: firstEvaluatorId || null,
        secondEvaluatorId: secondEvaluatorId || null,
        status: "DRAFT",
        competencyEvaluations: {
          create: competencyItems.map((item) => ({
            competencyItemId: item.id,
          })),
        },
      },
      include: {
        employee: {
          select: {
            lastName: true,
            firstName: true,
            department: { select: { name: true } },
          },
        },
        period: { select: { name: true } },
        competencyEvaluations: {
          include: { competencyItem: true },
        },
        kpiGoals: true,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error("Failed to create evaluation:", error);
    return NextResponse.json(
      { error: "評価の作成に失敗しました" },
      { status: 500 }
    );
  }
}
