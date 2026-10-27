import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}`;
}

function fmtGender(g: string | null): string {
  if (g === "male") return "男性";
  if (g === "female") return "女性";
  if (g === "other") return "その他";
  return "";
}

function fmtBloodType(b: string | null): string {
  if (!b) return "";
  if (b === "A") return "A型";
  if (b === "B") return "B型";
  if (b === "O") return "O型";
  if (b === "AB") return "AB型";
  if (b === "unknown") return "不明";
  return b;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
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
    const bumon = dept?.parentDepartment?.name ?? dept?.name ?? "";
    const han = dept?.parentDepartment ? dept.name : "";

    return {
      // ── 基本情報 ──────────────────────────────────
      "No": idx + 1,
      "社員コード": emp.employeeCode,
      "姓": emp.lastName,
      "名": emp.firstName,
      "姓（カナ）": emp.lastNameKana ?? "",
      "名（カナ）": emp.firstNameKana ?? "",
      "性別": fmtGender(emp.gender),
      "生年月日": fmtDate(emp.birthDate),
      "血液型": fmtBloodType(emp.bloodType),
      "メールアドレス": emp.email ?? "",
      "電話番号": emp.phone ?? "",
      "住所": emp.address ?? "",
      "ステータス": emp.isActive ? "在籍" : "退職",
      "入社日": fmtDate(emp.hireDate),
      "退職日": fmtDate(emp.retirementDate),
      // ── 所属情報 ──────────────────────────────────
      "所属名": emp.company?.name ?? "",
      "部署コード": dept?.code ?? "",
      "部署名": bumon,
      "班・グループ": han ?? "",
      "役職名": emp.position?.name ?? "",
      "職種名": emp.jobType?.name ?? "",
      // ── 給与情報 ──────────────────────────────────
      "等級": emp.grade ?? "",
      "号俸": emp.salaryStep ?? "",
      "基本給": emp.baseSalary,
      "資格手当": emp.qualificationAllowance,
      "役職手当": emp.positionAllowance,
      "その他手当①名称": emp.otherAllowance1Name ?? "",
      "その他手当①金額": emp.otherAllowance1Amount,
      "その他手当②名称": emp.otherAllowance2Name ?? "",
      "その他手当②金額": emp.otherAllowance2Amount,
      "その他手当③名称": emp.otherAllowance3Name ?? "",
      "その他手当③金額": emp.otherAllowance3Amount,
      // ── 社会保険 ──────────────────────────────────
      "健康保険番号": emp.healthInsuranceNumber ?? "",
      "健康保険資格取得日": fmtDate(emp.healthInsuranceAcquiredDate),
      "健康保険資格喪失日": fmtDate(emp.healthInsuranceLostDate),
      "厚生年金保険番号": emp.pensionInsuranceNumber ?? "",
      "厚生年金資格取得日": fmtDate(emp.pensionAcquiredDate),
      "厚生年金資格喪失日": fmtDate(emp.pensionLostDate),
      "基礎年金番号": emp.basicPensionNumber ?? "",
      "雇用保険被保険者番号": emp.employmentInsuranceNumber ?? "",
      "雇用保険資格取得日": fmtDate(emp.employmentInsuranceAcquiredDate),
      "雇用保険資格喪失日": fmtDate(emp.employmentInsuranceLostDate),
      // ── 緊急連絡先 ────────────────────────────────
      "緊急連絡先氏名": emp.emergencyContactName ?? "",
      "緊急連絡先続柄": emp.emergencyContactRelationship ?? "",
      "緊急連絡先電話番号": emp.emergencyContactPhone ?? "",
      "緊急連絡先住所": emp.emergencyContactAddress ?? "",
      // ── 氏名変更 ──────────────────────────────────
      "氏名変更理由": "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 5 },  // No
    { wch: 12 }, // 社員コード
    { wch: 8 },  // 姓
    { wch: 8 },  // 名
    { wch: 10 }, // 姓（カナ）
    { wch: 10 }, // 名（カナ）
    { wch: 6 },  // 性別
    { wch: 12 }, // 生年月日
    { wch: 6 },  // 血液型
    { wch: 24 }, // メールアドレス
    { wch: 14 }, // 電話番号
    { wch: 24 }, // 住所
    { wch: 8 },  // ステータス
    { wch: 12 }, // 入社日
    { wch: 12 }, // 退職日
    { wch: 18 }, // 所属名
    { wch: 10 }, // 部署コード
    { wch: 18 }, // 部署名
    { wch: 16 }, // 班・グループ
    { wch: 14 }, // 役職名
    { wch: 14 }, // 職種名
    { wch: 6 },  // 等級
    { wch: 6 },  // 号俸
    { wch: 10 }, // 基本給
    { wch: 10 }, // 資格手当
    { wch: 10 }, // 役職手当
    { wch: 14 }, // その他手当①名称
    { wch: 10 }, // その他手当①金額
    { wch: 14 }, // その他手当②名称
    { wch: 10 }, // その他手当②金額
    { wch: 14 }, // その他手当③名称
    { wch: 10 }, // その他手当③金額
    { wch: 16 }, // 健康保険番号
    { wch: 16 }, // 健康保険資格取得日
    { wch: 16 }, // 健康保険資格喪失日
    { wch: 16 }, // 厚生年金保険番号
    { wch: 16 }, // 厚生年金資格取得日
    { wch: 16 }, // 厚生年金資格喪失日
    { wch: 16 }, // 基礎年金番号
    { wch: 20 }, // 雇用保険被保険者番号
    { wch: 16 }, // 雇用保険資格取得日
    { wch: 16 }, // 雇用保険資格喪失日
    { wch: 14 }, // 緊急連絡先氏名
    { wch: 10 }, // 緊急連絡先続柄
    { wch: 16 }, // 緊急連絡先電話番号
    { wch: 24 }, // 緊急連絡先住所
    { wch: 16 }, // 氏名変更理由
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "スタッフ詳細データ");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''staff_data_${today}.xlsx`,
    },
  });
}
