import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      company: true,
      department: {
        include: { parentDepartment: true },
      },
      position: true,
      jobType: true,
    },
    orderBy: [
      { company: { sortOrder: "asc" } },
      { department: { sortOrder: "asc" } },
      { employeeCode: "asc" },
    ],
  });

  const data = employees.map((emp, idx) => {
    const dept = emp.department;
    // 親部署がある場合: 部署=親部署名, 班・グループ=部署名
    // 親部署がない場合: 部署=部署名, 班・グループ=空
    const bumon = dept?.parentDepartment?.name ?? dept?.name ?? "";
    const han = dept?.parentDepartment ? (dept.name ?? "") : "";

    const yakushoku = [emp.position?.name, emp.jobType?.name]
      .filter(Boolean)
      .join("・");

    return {
      "No": idx + 1,
      "計上会社": emp.company?.name ?? "",
      "勤務先": emp.company?.name ?? "",
      "部署": bumon,
      "班・グループ": han,
      "役職・職種": yakushoku,
      "氏名": `${emp.lastName} ${emp.firstName}`,
      "雇用区分": emp.jobType?.name ?? "",
      "備考": "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 5 },  // No
    { wch: 20 }, // 計上会社
    { wch: 20 }, // 勤務先
    { wch: 18 }, // 部署
    { wch: 16 }, // 班・グループ
    { wch: 18 }, // 役職・職種
    { wch: 12 }, // 氏名
    { wch: 12 }, // 雇用区分
    { wch: 20 }, // 備考
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "名簿");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''meibo_${today}.xlsx`,
    },
  });
}
