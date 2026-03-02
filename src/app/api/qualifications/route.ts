import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/qualifications - List all qualifications
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const qualifications = await prisma.qualification.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { employeeQualifications: true },
        },
      },
    });

    return NextResponse.json({ qualifications });
  } catch (error) {
    console.error("資格一覧取得エラー:", error);
    return NextResponse.json(
      { error: "資格一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/qualifications - Create a new qualification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "資格名は必須です" },
        { status: 400 }
      );
    }

    const qualification = await prisma.qualification.create({
      data: {
        name,
        category: category || null,
        description: description || null,
      },
    });

    return NextResponse.json(qualification, { status: 201 });
  } catch (error) {
    console.error("資格登録エラー:", error);
    return NextResponse.json(
      { error: "資格の登録に失敗しました" },
      { status: 500 }
    );
  }
}
