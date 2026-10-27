import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const histories = await prisma.employeeNameHistory.findMany({
    orderBy: { changedAt: "desc" },
    take: 100,
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          lastName: true,
          firstName: true,
        },
      },
    },
  });

  return NextResponse.json({ histories });
}
