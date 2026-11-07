import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || undefined;

  const employees = await prisma.employee.findMany({
    where: { isActive: true, ...(companyId ? { companyId } : {}) },
    select: {
      id: true,
      employeeCode: true,
      lastName: true,
      firstName: true,
      profileImage: true,
      grade: true,
      baseSalary: true,
      workRole: true,
      gender: true,
      hireDate: true,
      department: {
        select: {
          id: true,
          name: true,
          parentDepartment: { select: { id: true, name: true } },
        },
      },
      position: { select: { id: true, name: true, level: true } },
      jobType: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: [{ department: { sortOrder: "asc" } }, { employeeCode: "asc" }],
  });

  return NextResponse.json({ employees });
}
