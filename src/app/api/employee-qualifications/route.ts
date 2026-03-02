import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/employee-qualifications - List employee qualifications with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId") || "";
    const qualificationId = searchParams.get("qualificationId") || "";

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (qualificationId) {
      where.qualificationId = qualificationId;
    }

    const employeeQualifications = await prisma.employeeQualification.findMany({
      where,
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
      orderBy: { acquiredDate: "desc" },
    });

    return NextResponse.json({ employeeQualifications });
  } catch (error) {
    console.error("社員資格一覧取得エラー:", error);
    return NextResponse.json(
      { error: "社員資格一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/employee-qualifications - Assign qualification to employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, qualificationId, acquiredDate, expiryDate, certificateNumber } = body;

    if (!employeeId || !qualificationId) {
      return NextResponse.json(
        { error: "社員と資格の選択は必須です" },
        { status: 400 }
      );
    }

    // Check for duplicate assignment
    const existing = await prisma.employeeQualification.findUnique({
      where: {
        employeeId_qualificationId: {
          employeeId,
          qualificationId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この社員には既にこの資格が割り当てられています" },
        { status: 400 }
      );
    }

    const employeeQualification = await prisma.employeeQualification.create({
      data: {
        employeeId,
        qualificationId,
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

    return NextResponse.json(employeeQualification, { status: 201 });
  } catch (error) {
    console.error("社員資格登録エラー:", error);
    return NextResponse.json(
      { error: "社員資格の登録に失敗しました" },
      { status: 500 }
    );
  }
}
