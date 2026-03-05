import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface EmployeeData {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  profileImage: string | null;
  isActive: boolean;
  position: {
    id: string;
    name: string;
    level: number;
  } | null;
}

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  employees: EmployeeData[];
}

interface DepartmentTreeNode {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  employeeCount: number;
  employees: EmployeeData[];
  children: DepartmentTreeNode[];
}

function buildTree(
  departments: DepartmentData[],
  parentId: string | null
): DepartmentTreeNode[] {
  return departments
    .filter((dept) => dept.parentDepartmentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((dept) => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      parentDepartmentId: dept.parentDepartmentId,
      sortOrder: dept.sortOrder,
      employeeCount: dept.employees.filter((e) => e.isActive).length,
      employees: dept.employees.filter((e) => e.isActive),
      children: buildTree(departments, dept.id),
    }));
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId") || "";
  const employeeWhere = companyId
    ? { isActive: true, companyId }
    : { isActive: true };

  const departments = await prisma.department.findMany({
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
          position: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
        orderBy: [
          { position: { level: "desc" } },
          { employeeCode: "asc" },
        ],
      },
    },
  });

  const tree = buildTree(departments, null);

  return NextResponse.json({ departments: tree });
}
