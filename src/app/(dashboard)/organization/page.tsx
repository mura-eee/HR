import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerCompanyId } from "@/lib/server-company";
import OrgChartClient from "./org-chart-client";

interface EmployeeData {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  profileImage: string | null;
  isActive: boolean;
  position: { id: string; name: string; level: number } | null;
}

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  employees: EmployeeData[];
}

interface DeptNode {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  employeeCount: number;
  employees: EmployeeData[];
  children: DeptNode[];
}

function buildTree(depts: DepartmentData[], parentId: string | null): DeptNode[] {
  return depts
    .filter((d) => d.parentDepartmentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      parentDepartmentId: d.parentDepartmentId,
      sortOrder: d.sortOrder,
      employeeCount: d.employees.filter((e) => e.isActive).length,
      employees: d.employees.filter((e) => e.isActive),
      children: buildTree(depts, d.id),
    }));
}

function countAll(node: DeptNode): number {
  return node.employees.length + node.children.reduce((s, c) => s + countAll(c), 0);
}

function pruneEmpty(node: DeptNode): DeptNode | null {
  const prunedChildren = node.children.map(pruneEmpty).filter(Boolean) as DeptNode[];
  if (node.employees.length === 0 && prunedChildren.length === 0) return null;
  return { ...node, children: prunedChildren };
}

export default async function OrganizationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const companyId = await getServerCompanyId();
  const employeeWhere = companyId
    ? { isActive: true, companyId }
    : { isActive: true };

  const depts = await prisma.department.findMany({
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
        orderBy: [{ position: { level: "desc" } }, { employeeCode: "asc" }],
      },
    },
  });

  const initialDepartments = buildTree(depts, null);

  let initialCompanyGroups: {
    id: string;
    name: string;
    sortOrder: number;
    totalCount: number;
    departments: DeptNode[];
  }[] = [];

  if (!companyId) {
    const companies = await prisma.company.findMany({ orderBy: { sortOrder: "asc" } });
    for (const company of companies) {
      const companyDepts = await prisma.department.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          employees: {
            where: { isActive: true, companyId: company.id },
            select: {
              id: true,
              employeeCode: true,
              lastName: true,
              firstName: true,
              profileImage: true,
              isActive: true,
              position: { select: { id: true, name: true, level: true } },
            },
            orderBy: [{ position: { level: "desc" } }, { employeeCode: "asc" }],
          },
        },
      });

      const tree = buildTree(companyDepts, null)
        .map(pruneEmpty)
        .filter(Boolean) as DeptNode[];
      const count = tree.reduce((s, n) => s + countAll(n), 0);
      if (count > 0) {
        initialCompanyGroups.push({
          id: company.id,
          name: company.name,
          sortOrder: company.sortOrder,
          totalCount: count,
          departments: tree,
        });
      }
    }
  }

  return (
    <OrgChartClient
      initialDepartments={initialDepartments}
      initialCompanyGroups={initialCompanyGroups}
      initialCompanyId={companyId}
    />
  );
}
