import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/evaluation-periods - List all evaluation periods
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const periods = await prisma.evaluationPeriod.findMany({
      orderBy: [{ year: "desc" }, { half: "desc" }],
    });

    return NextResponse.json({ periods });
  } catch (error) {
    console.error("評価期間一覧取得エラー:", error);
    return NextResponse.json(
      { error: "評価期間一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/settings/evaluation-periods - Create a new evaluation period
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

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

    if (
      !name ||
      !assessmentStartDate ||
      !assessmentEndDate ||
      !evaluationStartDate ||
      !evaluationEndDate ||
      !half ||
      !year
    ) {
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
        half: half as "FIRST" | "SECOND",
        year: parseInt(String(year), 10),
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("評価期間登録エラー:", error);
    return NextResponse.json(
      { error: "評価期間の登録に失敗しました" },
      { status: 500 }
    );
  }
}
