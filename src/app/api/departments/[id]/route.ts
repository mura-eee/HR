import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/departments/[id] - Get a single department
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

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        parentDepartment: {
          select: { id: true, name: true },
        },
        childDepartments: {
          select: { id: true, name: true, code: true },
        },
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

    if (!department) {
      return NextResponse.json(
        { error: "部署が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("部署取得エラー:", error);
    return NextResponse.json(
      { error: "部署の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/departments/[id] - Update a department
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
    const { name, code, parentDepartmentId, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "部署名と部署コードは必須です" },
        { status: 400 }
      );
    }

    // Prevent setting self as parent
    if (parentDepartmentId === id) {
      return NextResponse.json(
        { error: "自分自身を親部署に設定できません" },
        { status: 400 }
      );
    }

    // Check for duplicate code (excluding self)
    const existing = await prisma.department.findFirst({
      where: { code, id: { not: id } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この部署コードは既に使用されています" },
        { status: 400 }
      );
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        parentDepartmentId: parentDepartmentId || null,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
      },
      include: {
        parentDepartment: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error("部署更新エラー:", error);
    return NextResponse.json(
      { error: "部署の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/[id] - Delete a department
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

    // Check for child departments
    const childCount = await prisma.department.count({
      where: { parentDepartmentId: id },
    });

    if (childCount > 0) {
      return NextResponse.json(
        { error: "子部署が存在するため削除できません" },
        { status: 400 }
      );
    }

    // Check for employees
    const employeeCount = await prisma.employee.count({
      where: { departmentId: id },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { error: "所属社員が存在するため削除できません" },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ message: "部署を削除しました" });
  } catch (error) {
    console.error("部署削除エラー:", error);
    return NextResponse.json(
      { error: "部署の削除に失敗しました" },
      { status: 500 }
    );
  }
}
