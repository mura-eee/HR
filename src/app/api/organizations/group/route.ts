import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface EmployeeData {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
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
      employeeCount: d.employees.length,
      employees: d.employees,
      children: buildTree(depts, d.id),
    }));
}

function countAll(node: DeptNode): number {
  return node.employees.length + node.children.reduce((s, c) => s + countAll(c), 0);
}

function pruneEmpty(node: DeptNode): DeptNode | null {
  const prunedChildren = node.children
    .map(pruneEmpty)
    .filter(Boolean) as DeptNode[];
  if (node.employees.length === 0 && prunedChildren.length === 0) return null;
  return { ...node, children: prunedChildren };
}

export interface CompanyGroupData {
  id: string;
  name: string;
  sortOrder: number;
  totalCount: number;
  departments: DeptNode[];
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const result: CompanyGroupData[] = [];
  let totalCount = 0;

  for (const company of companies) {
    const depts = await prisma.department.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        employees: {
          where: { isActive: true, companyId: company.id },
          select: {
            id: true,
            employeeCode: true,
            lastName: true,
            firstName: true,
            position: { select: { id: true, name: true, level: true } },
          },
          orderBy: [
            { position: { level: "desc" } },
            { employeeCode: "asc" },
          ],
        },
      },
    });

    const tree = buildTree(depts, null)
      .map(pruneEmpty)
      .filter(Boolean) as DeptNode[];

    const count = tree.reduce((s, n) => s + countAll(n), 0);
    if (count > 0) {
      result.push({
        id: company.id,
        name: company.name,
        sortOrder: company.sortOrder,
        totalCount: count,
        departments: tree,
      });
      totalCount += count;
    }
  }

  return NextResponse.json({ companies: result, totalCount });
}
