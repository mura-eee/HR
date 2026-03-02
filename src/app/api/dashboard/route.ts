import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalEmployees,
    totalDepartments,
    activeEvaluations,
    totalQualifications,
    departmentBreakdown,
    recentEvaluations,
  ] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.department.count(),
    prisma.evaluation.count({
      where: { status: { not: "COMPLETED" } },
    }),
    prisma.employeeQualification.count(),
    prisma.department.findMany({
      select: {
        name: true,
        _count: { select: { employees: { where: { isActive: true } } } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.evaluation.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
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
    departmentBreakdown: departmentBreakdown.map((d) => ({
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
