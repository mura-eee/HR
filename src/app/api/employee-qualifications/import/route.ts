import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "number") {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const str = String(val).trim();
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
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

  const results = { created: 0, updated: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1行目はヘッダーなので2行目から
    const employeeCode = String(row["社員番号"] ?? "").trim();
    const qualificationName = String(row["資格"] ?? "").trim();

    if (!employeeCode && !qualificationName) {
      // 空行はスキップ
      continue;
    }
    if (!employeeCode) {
      results.errors.push(`${rowNum}行目: 社員番号が入力されていません`);
      continue;
    }
    if (!qualificationName) {
      results.errors.push(`${rowNum}行目 (社員番号: ${employeeCode}): 資格名が入力されていません`);
      continue;
    }

    const employee = await prisma.employee.findUnique({ where: { employeeCode } });
    if (!employee) {
      results.errors.push(`${rowNum}行目: 社員番号「${employeeCode}」の社員が見つかりません`);
      continue;
    }

    // Find or create qualification by name
    let qualification = await prisma.qualification.findFirst({
      where: { name: qualificationName },
    });
    if (!qualification) {
      try {
        qualification = await prisma.qualification.create({
          data: { name: qualificationName },
        });
      } catch (err) {
        results.errors.push(
          `${rowNum}行目: 資格「${qualificationName}」の作成に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`
        );
        continue;
      }
    }

    const acquiredDate = parseDate(row["取得日"]);
    const expiryDate = parseDate(row["有効期限"]);
    const data = {
      acquiredDate,
      expiryDate,
      certificateNumber: String(row["証明書番号"] ?? "").trim() || null,
    };

    try {
      const existing = await prisma.employeeQualification.findUnique({
        where: {
          employeeId_qualificationId: {
            employeeId: employee.id,
            qualificationId: qualification.id,
          },
        },
      });

      if (existing) {
        await prisma.employeeQualification.update({
          where: { id: existing.id },
          data,
        });
        results.updated++;
      } else {
        await prisma.employeeQualification.create({
          data: {
            employeeId: employee.id,
            qualificationId: qualification.id,
            ...data,
          },
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push(
        `${rowNum}行目 (社員番号: ${employeeCode} / 資格: ${qualificationName}): ${err instanceof Error ? err.message : "不明なエラー"}`
      );
    }
  }

  return NextResponse.json(results);
}
