import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerCompanyId } from "@/lib/server-company";
import EmployeesClient from "./employees-client";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const companyId = await getServerCompanyId();

  const where = {
    isActive: true,
    ...(companyId ? { companyId } : {}),
  };

  const limit = 10;

  const [employees, total, departments] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            parentDepartment: { select: { id: true, name: true } },
          },
        },
        position: { select: { id: true, name: true, level: true } },
      },
      orderBy: { employeeCode: "asc" },
      take: limit,
    }),
    prisma.employee.count({ where }),
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        parentDepartment: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const initialEmployees = employees.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    lastName: e.lastName,
    firstName: e.firstName,
    lastNameKana: e.lastNameKana,
    firstNameKana: e.firstNameKana,
    email: e.email,
    hireDate: e.hireDate ? e.hireDate.toISOString() : null,
    grade: e.grade,
    isActive: e.isActive,
    department: e.department,
    position: e.position,
  }));

  return (
    <EmployeesClient
      initialEmployees={initialEmployees}
      initialPagination={{
        total,
        page: 1,
        limit,
        totalPages: Math.ceil(total / limit),
      }}
      initialDepartments={departments}
      initialCompanyId={companyId}
    />
  );
}
