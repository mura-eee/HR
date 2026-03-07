import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  // Excel serial number
  if (typeof val === "number") {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const str = String(val).trim();
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toInt(val: unknown, fallback = 0): number {
  const n = parseInt(String(val ?? ""), 10);
  return isNaN(n) ? fallback : n;
}

// 空欄の場合はnullを返す（等級・号俸など）
function toIntOrNull(val: unknown): number | null {
  if (val === undefined || val === null || String(val).trim() === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { raw: true }) as Record<string, unknown>[];

  // マスタデータを一括取得
  const [departments, positions, companies, jobTypes] = await Promise.all([
    prisma.department.findMany(),
    prisma.position.findMany(),
    prisma.company.findMany(),
    prisma.jobType.findMany(),
  ]);

  const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));
  const positionByName = Object.fromEntries(positions.map((p) => [p.name, p]));
  const companyByName = Object.fromEntries(companies.map((c) => [c.name, c]));
  const jobTypeByName = Object.fromEntries(jobTypes.map((j) => [j.name, j]));

  const results = { created: 0, updated: 0, errors: [] as string[] };

  for (const row of rows) {
    const employeeCode = String(row["社員コード"] ?? "").trim();
    if (!employeeCode) continue;

    const lastName = String(row["姓"] ?? "").trim();
    const firstName = String(row["名"] ?? "").trim();
    const email = String(row["メールアドレス"] ?? "").trim() || null;

    if (!lastName || !firstName) {
      results.errors.push(`社員コード ${employeeCode}: 姓・名は必須です`);
      continue;
    }

    const deptCode = String(row["部署コード"] ?? "").trim();
    const dept = deptByCode[deptCode] || null;

    const positionName = String(row["役職名"] ?? "").trim();
    const position = positionByName[positionName] || null;

    // 所属（会社名で検索）
    const companyName = String(row["所属名"] ?? "").trim();
    const company = companyName ? (companyByName[companyName] || null) : null;

    // 職種（職種名で検索）
    const jobTypeName = String(row["職種名"] ?? "").trim();
    const jobType = jobTypeName ? (jobTypeByName[jobTypeName] || null) : null;

    const genderStr = String(row["性別"] ?? "").trim();
    const gender = genderStr === "男性" ? "male" : genderStr === "女性" ? "female" : genderStr === "その他" ? "other" : null;

    const statusStr = String(row["ステータス"] ?? "").trim();
    const isActive = statusStr !== "退職";

    const otherAllowance1Name = String(row["その他手当①名称"] ?? "").trim() || null;
    const otherAllowance2Name = String(row["その他手当②名称"] ?? "").trim() || null;
    const otherAllowance3Name = String(row["その他手当③名称"] ?? "").trim() || null;

    // 血液型
    const bloodTypeRaw = String(row["血液型"] ?? "").trim();
    const bloodType = bloodTypeRaw === "A型" ? "A"
      : bloodTypeRaw === "B型" ? "B"
      : bloodTypeRaw === "O型" ? "O"
      : bloodTypeRaw === "AB型" ? "AB"
      : bloodTypeRaw === "不明" ? "unknown"
      : bloodTypeRaw || null;

    const data = {
      lastName,
      firstName,
      lastNameKana: String(row["姓（カナ）"] ?? "").trim() || null,
      firstNameKana: String(row["名（カナ）"] ?? "").trim() || null,
      email,
      phone: String(row["電話番号"] ?? "").trim() || null,
      hireDate: parseDate(row["入社日"]),
      birthDate: parseDate(row["生年月日"]),
      gender,
      address: String(row["住所"] ?? "").trim() || null,
      companyId: company?.id || null,
      departmentId: dept?.id || null,
      positionId: position?.id || null,
      jobTypeId: jobType?.id || null,
      grade: toIntOrNull(row["等級"]),
      salaryStep: toIntOrNull(row["号俸"]),
      baseSalary: toInt(row["基本給"], 0),
      qualificationAllowance: toInt(row["資格手当"], 0),
      positionAllowance: toInt(row["役職手当"], 0),
      otherAllowance1Name,
      otherAllowance1Amount: toInt(row["その他手当①金額"], 0),
      otherAllowance2Name,
      otherAllowance2Amount: toInt(row["その他手当②金額"], 0),
      otherAllowance3Name,
      otherAllowance3Amount: toInt(row["その他手当③金額"], 0),
      isActive,
      // 社会保険
      healthInsuranceNumber: String(row["健康保険番号"] ?? "").trim() || null,
      healthInsuranceAcquiredDate: parseDate(row["健康保険資格取得日"]),
      healthInsuranceLostDate: parseDate(row["健康保険資格喪失日"]),
      pensionInsuranceNumber: String(row["厚生年金保険番号"] ?? "").trim() || null,
      pensionAcquiredDate: parseDate(row["厚生年金資格取得日"]),
      pensionLostDate: parseDate(row["厚生年金資格喪失日"]),
      basicPensionNumber: String(row["基礎年金番号"] ?? "").trim() || null,
      employmentInsuranceAcquiredDate: parseDate(row["雇用保険資格取得日"]),
      employmentInsuranceLostDate: parseDate(row["雇用保険資格喪失日"]),
      employmentInsuranceNumber: String(row["雇用保険被保険者番号"] ?? "").trim() || null,
      bloodType,
      // 緊急連絡先
      emergencyContactName: String(row["緊急連絡先氏名"] ?? "").trim() || null,
      emergencyContactRelationship: String(row["緊急連絡先続柄"] ?? "").trim() || null,
      emergencyContactPhone: String(row["緊急連絡先電話番号"] ?? "").trim() || null,
      emergencyContactAddress: String(row["緊急連絡先住所"] ?? "").trim() || null,
    };

    try {
      const existing = await prisma.employee.findUnique({ where: { employeeCode } });
      if (existing) {
        await prisma.employee.update({ where: { employeeCode }, data });
        results.updated++;
      } else {
        await prisma.employee.create({ data: { ...data, employeeCode } });
        results.created++;
      }
    } catch (err) {
      results.errors.push(`社員コード ${employeeCode}: ${err instanceof Error ? err.message : "エラー"}`);
    }
  }

  return NextResponse.json(results);
}
