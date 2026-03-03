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

  const employees = await prisma.employee.findMany({
    include: {
      department: true,
      position: true,
    },
    orderBy: { employeeCode: "asc" },
  });

  const data = employees.map((emp) => ({
    "社員コード": emp.employeeCode,
    "姓": emp.lastName,
    "名": emp.firstName,
    "姓（カナ）": emp.lastNameKana || "",
    "名（カナ）": emp.firstNameKana || "",
    "メールアドレス": emp.email || "",
    "電話番号": emp.phone || "",
    "入社日": formatDate(emp.hireDate),
    "生年月日": formatDate(emp.birthDate),
    "性別": emp.gender === "male" ? "男性" : emp.gender === "female" ? "女性" : emp.gender === "other" ? "その他" : "",
    "住所": emp.address || "",
    "部署コード": emp.department?.code || "",
    "部署名": emp.department?.name || "",
    "役職名": emp.position?.name || "",
    "等級": emp.grade ?? "",
    "号俸": emp.salaryStep ?? "",
    "基本給": emp.baseSalary ?? 0,
    "資格手当": emp.qualificationAllowance ?? 0,
    "役職手当": emp.positionAllowance ?? 0,
    "その他手当①名称": emp.otherAllowance1Name || "",
    "その他手当①金額": emp.otherAllowance1Amount ?? 0,
    "その他手当②名称": emp.otherAllowance2Name || "",
    "その他手当②金額": emp.otherAllowance2Amount ?? 0,
    "その他手当③名称": emp.otherAllowance3Name || "",
    "その他手当③金額": emp.otherAllowance3Amount ?? 0,
    "ステータス": emp.isActive ? "在籍" : "退職",
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
    { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 6 },
    { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 },
    { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 },
    { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "社員一覧");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''employees_${today}.xlsx`,
    },
  });
}
