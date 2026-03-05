import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { employees: true } } },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("所属企業一覧取得エラー:", error);
    return NextResponse.json({ error: "所属企業一覧の取得に失敗しました" }, { status: 500 });
  }
}

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
    const { name, code, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "会社名とコードは必須です" }, { status: 400 });
    }

    const existing = await prisma.company.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "このコードは既に使用されています" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: { name, code, sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0 },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("所属企業登録エラー:", error);
    return NextResponse.json({ error: "所属企業の登録に失敗しました" }, { status: 500 });
  }
}
