import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getServerCompanyId } from "@/lib/server-company";
import { getCachedEmployees, getCachedDepartments } from "@/lib/server-cache";
import EmployeesClient from "./employees-client";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const companyId = await getServerCompanyId();

  const [{ employees, total }, departments] = await Promise.all([
    getCachedEmployees(companyId),
    getCachedDepartments(),
  ]);

  const limit = 10;

  const initialEmployees = employees.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    lastName: e.lastName,
    firstName: e.firstName,
    lastNameKana: e.lastNameKana,
    firstNameKana: e.firstNameKana,
    email: e.email,
    hireDate: e.hireDate ? new Date(e.hireDate).toISOString() : null,
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
