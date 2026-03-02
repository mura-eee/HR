import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/employee-qualifications/[id] - Update employee qualification
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
    const { acquiredDate, expiryDate, certificateNumber } = body;

    const employeeQualification = await prisma.employeeQualification.update({
      where: { id },
      data: {
        acquiredDate: acquiredDate ? new Date(acquiredDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        certificateNumber: certificateNumber || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            lastName: true,
            firstName: true,
          },
        },
        qualification: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(employeeQualification);
  } catch (error) {
    console.error("社員資格更新エラー:", error);
    return NextResponse.json(
      { error: "社員資格の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/employee-qualifications/[id] - Delete employee qualification
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

    await prisma.employeeQualification.delete({
      where: { id },
    });

    return NextResponse.json({ message: "社員資格を削除しました" });
  } catch (error) {
    console.error("社員資格削除エラー:", error);
    return NextResponse.json(
      { error: "社員資格の削除に失敗しました" },
      { status: 500 }
    );
  }
}
