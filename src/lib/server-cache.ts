import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

// ダッシュボード集計（会社IDごとに30秒キャッシュ）
export const getCachedDashboardStats = unstable_cache(
  async (companyId: string | null) => {
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
            select: { employees: { where: { isActive: true, ...companyFilter } } },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.evaluation.findMany({
        where: companyId ? { employee: { companyId } } : {},
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          employee: { select: { lastName: true, firstName: true, department: { select: { name: true } } } },
          period: { select: { name: true } },
        },
      }),
    ]);
    return { totalEmployees, totalDepartments, activeEvaluations, totalQualifications, departmentBreakdown, recentEvaluations };
  },
  ["dashboard-stats"],
  { revalidate: 30, tags: ["employees", "departments", "evaluations"] }
);

// 組織図データ（会社IDごとに30秒キャッシュ）
export const getCachedOrgDepartments = unstable_cache(
  async (companyId: string | null) => {
    const employeeWhere = companyId
      ? { isActive: true, companyId }
      : { isActive: true };
    return prisma.department.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        employees: {
          where: employeeWhere,
          select: {
            id: true,
            employeeCode: true,
            lastName: true,
            firstName: true,
            profileImage: true,
            isActive: true,
            position: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });
  },
  ["org-departments"],
  { revalidate: 30, tags: ["employees", "departments"] }
);

// 部署一覧（会社に依存しない・60秒キャッシュ）
export const getCachedDepartments = unstable_cache(
  async () => {
    return prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        sortOrder: true,
        parentDepartment: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
  },
  ["departments"],
  { revalidate: 60, tags: ["departments"] }
);

// 社員一覧（会社IDごとにキャッシュ・30秒）
export const getCachedEmployees = unstable_cache(
  async (companyId: string | null) => {
    const where = {
      isActive: true,
      ...(companyId ? { companyId } : {}),
    };
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeCode: true,
          lastName: true,
          firstName: true,
          lastNameKana: true,
          firstNameKana: true,
          email: true,
          hireDate: true,
          grade: true,
          isActive: true,
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
        take: 10,
      }),
      prisma.employee.count({ where }),
    ]);
    return { employees, total };
  },
  ["employees"],
  { revalidate: 30, tags: ["employees"] }
);
