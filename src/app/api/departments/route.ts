import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/departments - List all departments
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        parentDepartment: {
          select: { id: true, name: true },
        },
        _count: {
          select: { employees: true, childDepartments: true },
        },
      },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("部署一覧取得エラー:", error);
    return NextResponse.json(
      { error: "部署一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create a new department
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
    const { name, code, parentDepartmentId, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "部署名と部署コードは必須です" },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existing = await prisma.department.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この部署コードは既に使用されています" },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        parentDepartmentId: parentDepartmentId || null,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
      },
      include: {
        parentDepartment: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("部署登録エラー:", error);
    return NextResponse.json(
      { error: "部署の登録に失敗しました" },
      { status: 500 }
    );
  }
}
