import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/qualifications/[id] - Get a single qualification
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

    const qualification = await prisma.qualification.findUnique({
      where: { id },
      include: {
        employeeQualifications: {
          include: {
            employee: {
              select: { id: true, lastName: true, firstName: true, employeeCode: true },
            },
          },
        },
      },
    });

    if (!qualification) {
      return NextResponse.json(
        { error: "資格が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(qualification);
  } catch (error) {
    console.error("資格取得エラー:", error);
    return NextResponse.json(
      { error: "資格の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/qualifications/[id] - Update a qualification
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, category, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "資格名は必須です" },
        { status: 400 }
      );
    }

    const qualification = await prisma.qualification.update({
      where: { id },
      data: {
        name,
        category: category || null,
        description: description || null,
      },
    });

    return NextResponse.json(qualification);
  } catch (error) {
    console.error("資格更新エラー:", error);
    return NextResponse.json(
      { error: "資格の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/qualifications/[id] - Delete a qualification
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.qualification.delete({
      where: { id },
    });

    return NextResponse.json({ message: "資格を削除しました" });
  } catch (error) {
    console.error("資格削除エラー:", error);
    return NextResponse.json(
      { error: "資格の削除に失敗しました" },
      { status: 500 }
    );
  }
}
