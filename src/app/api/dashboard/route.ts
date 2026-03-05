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
  const companyId = searchParams.get("companyId") || "";

  // companyIdが指定されていれば絞り込み、なければ全社（トキトグループ）
  const companyFilter = companyId ? { companyId } : {};

  const [
    totalEmployees,
    totalDepartments,
    activeEvaluations,
    totalQualifications,
    departmentBreakdown,
    recentEvaluations,
  ] = await Promise.all([
    prisma.employee.count({ where: { isActive: true, ...companyFilter } }),
    prisma.department.count(),
    prisma.evaluation.count({
      where: {
        status: { not: "COMPLETED" },
        ...(companyId ? { employee: { companyId } } : {}),
      },
    }),
    prisma.employeeQualification.count({
      where: companyId ? { employee: { companyId } } : {},
    }),
    prisma.department.findMany({
      select: {
        name: true,
        _count: {
          select: {
            employees: {
              where: { isActive: true, ...companyFilter },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.evaluation.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      where: companyId ? { employee: { companyId } } : {},
      include: {
        employee: { select: { lastName: true, firstName: true } },
        period: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totalEmployees,
    totalDepartments,
    activeEvaluations,
    totalQualifications,
    departmentBreakdown: departmentBreakdown
      .filter((d) => d._count.employees > 0)
      .map((d) => ({
        name: d.name,
        count: d._count.employees,
      })),
    recentEvaluations: recentEvaluations.map((e) => ({
      id: e.id,
      employeeName: `${e.employee.lastName} ${e.employee.firstName}`,
      status: e.status,
      periodName: e.period.name,
    })),
  });
}
