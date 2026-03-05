import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/settings/users/[id] - Update user role (admin only)
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
    const { role } = body;

    if (!role || !["ADMIN", "MANAGER", "GENERAL"].includes(role)) {
      return NextResponse.json(
        { error: "無効なロールです" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as "ADMIN" | "MANAGER" | "GENERAL" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        employeeId: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("ユーザーロール更新エラー:", error);
    return NextResponse.json(
      { error: "ロールの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/users/[id] - Delete user (admin only)
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

    // 自分自身は削除不可
    const currentUser = await prisma.user.findUnique({ where: { email: session.user?.email ?? "" } });
    if (currentUser?.id === id) {
      return NextResponse.json({ error: "自分自身のアカウントは削除できません" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ユーザー削除エラー:", error);
    return NextResponse.json({ error: "ユーザーの削除に失敗しました" }, { status: 500 });
  }
}
