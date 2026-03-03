import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function formatDate(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.employeeQualification.findMany({
    include: {
      employee: {
        select: { employeeCode: true, lastName: true, firstName: true },
      },
      qualification: {
        select: { name: true },
      },
    },
    orderBy: [
      { employee: { employeeCode: "asc" } },
      { qualification: { name: "asc" } },
    ],
  });

  const data = records.map((r) => ({
    "社員番号": r.employee.employeeCode,
    "社員名": `${r.employee.lastName} ${r.employee.firstName}`,
    "資格": r.qualification.name,
    "取得日": formatDate(r.acquiredDate),
    "有効期限": formatDate(r.expiryDate),
    "証明書番号": r.certificateNumber || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "社員資格");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''qualifications_${today}.xlsx`,
    },
  });
}
