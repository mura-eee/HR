import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/settings/evaluation-periods/[id] - Update an evaluation period
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;
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
      !evaluationEndDate
    ) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    const period = await prisma.evaluationPeriod.update({
      where: { id },
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

    return NextResponse.json(period);
  } catch (error) {
    console.error("評価期間更新エラー:", error);
    return NextResponse.json(
      { error: "評価期間の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/evaluation-periods/[id] - Delete an evaluation period
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;

    // Check for associated evaluations
    const evaluationCount = await prisma.evaluation.count({
      where: { periodId: id },
    });

    if (evaluationCount > 0) {
      return NextResponse.json(
        { error: "この評価期間に関連する評価が存在するため削除できません" },
        { status: 400 }
      );
    }

    await prisma.evaluationPeriod.delete({
      where: { id },
    });

    return NextResponse.json({ message: "評価期間を削除しました" });
  } catch (error) {
    console.error("評価期間削除エラー:", error);
    return NextResponse.json(
      { error: "評価期間の削除に失敗しました" },
      { status: 500 }
    );
  }
}
