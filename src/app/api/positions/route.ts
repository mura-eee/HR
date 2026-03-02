import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/positions - List all positions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const positions = await prisma.position.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    return NextResponse.json({ positions });
  } catch (error) {
    console.error("役職一覧取得エラー:", error);
    return NextResponse.json(
      { error: "役職一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/positions - Create a new position
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
    const { name, level, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "役職名は必須です" },
        { status: 400 }
      );
    }

    const position = await prisma.position.create({
      data: {
        name,
        level: level !== undefined ? parseInt(String(level), 10) : 0,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error("役職登録エラー:", error);
    return NextResponse.json(
      { error: "役職の登録に失敗しました" },
      { status: 500 }
    );
  }
}
