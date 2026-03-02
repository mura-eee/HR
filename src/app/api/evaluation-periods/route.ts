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
  const year = searchParams.get("year");
  const half = searchParams.get("half");
  const activeOnly = searchParams.get("activeOnly");

  const where: Record<string, unknown> = {};
  if (year) where.year = parseInt(year);
  if (half) where.half = half;
  if (activeOnly === "true") where.isActive = true;

  const periods = await prisma.evaluationPeriod.findMany({
    where,
    orderBy: [{ year: "desc" }, { half: "desc" }],
    include: {
      _count: {
        select: { evaluations: true },
      },
    },
  });

  return NextResponse.json(periods);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      assessmentStartDate,
      assessmentEndDate,
      evaluationStartDate,
      evaluationEndDate,
      half,
      year,
      isActive,
    } = body;

    if (!name || !assessmentStartDate || !assessmentEndDate || !evaluationStartDate || !evaluationEndDate || !half || !year) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    const period = await prisma.evaluationPeriod.create({
      data: {
        name,
        assessmentStartDate: new Date(assessmentStartDate),
        assessmentEndDate: new Date(assessmentEndDate),
        evaluationStartDate: new Date(evaluationStartDate),
        evaluationEndDate: new Date(evaluationEndDate),
        half,
        year: parseInt(year),
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("Failed to create evaluation period:", error);
    return NextResponse.json(
      { error: "評価期間の作成に失敗しました" },
      { status: 500 }
    );
  }
}
