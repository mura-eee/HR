import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SimChange {
  employeeId: string;
  departmentId?: string | null;
  positionId?: string | null;
  workRole?: string | null;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const changes: SimChange[] = body.changes ?? [];

  if (changes.length === 0) {
    return NextResponse.json({ success: true, applied: 0 });
  }

  await prisma.$transaction(
    changes.map((c) =>
      prisma.employee.update({
        where: { id: c.employeeId },
        data: {
          ...(c.departmentId !== undefined ? { departmentId: c.departmentId } : {}),
          ...(c.positionId !== undefined ? { positionId: c.positionId } : {}),
          ...(c.workRole !== undefined ? { workRole: c.workRole } : {}),
        },
      })
    )
  );

  return NextResponse.json({ success: true, applied: changes.length });
}
