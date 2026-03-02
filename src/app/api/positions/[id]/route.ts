import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/positions/[id] - Get a single position
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            employeeCode: true,
            lastName: true,
            firstName: true,
          },
        },
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "役職が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error("役職取得エラー:", error);
    return NextResponse.json(
      { error: "役職の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/positions/[id] - Update a position
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
    const { name, level, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "役職名は必須です" },
        { status: 400 }
      );
    }

    const position = await prisma.position.update({
      where: { id },
      data: {
        name,
        level: level !== undefined ? parseInt(String(level), 10) : 0,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error("役職更新エラー:", error);
    return NextResponse.json(
      { error: "役職の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/positions/[id] - Delete a position
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

    // Check for employees using this position
    const employeeCount = await prisma.employee.count({
      where: { positionId: id },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { error: "この役職を使用している社員が存在するため削除できません" },
        { status: 400 }
      );
    }

    await prisma.position.delete({
      where: { id },
    });

    return NextResponse.json({ message: "役職を削除しました" });
  } catch (error) {
    console.error("役職削除エラー:", error);
    return NextResponse.json(
      { error: "役職の削除に失敗しました" },
      { status: 500 }
    );
  }
}
