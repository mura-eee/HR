import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

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

  // ── Step 1: 行バリデーション（DBアクセスなし）──────────────────────────────
  type ParsedRow = {
    rowNum: number;
    employeeCode: string;
    qualificationName: string;
    acquiredDate: Date | null;
    expiryDate: Date | null;
    certificateNumber: string | null;
  };
  const parsed: ParsedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const employeeCode = String(row["社員番号"] ?? "").trim();
    const qualificationName = String(row["資格"] ?? "").trim();

    if (!employeeCode && !qualificationName) continue;
    if (!employeeCode) {
      results.errors.push(`${rowNum}行目: 社員番号が入力されていません`);
      continue;
    }
    if (!qualificationName) {
      results.errors.push(`${rowNum}行目 (社員番号: ${employeeCode}): 資格名が入力されていません`);
      continue;
    }
    parsed.push({
      rowNum,
      employeeCode,
      qualificationName,
      acquiredDate: parseDate(row["取得日"]),
      expiryDate: parseDate(row["有効期限"]),
      certificateNumber: String(row["証明書番号"] ?? "").trim() || null,
    });
  }

  if (parsed.length === 0) return NextResponse.json(results);

  // ── Step 2: 必要な社員・資格のみ一括取得（2クエリ並列）──────────────────────
  const uniqueCodes = [...new Set(parsed.map((r) => r.employeeCode))];
  const uniqueNames = [...new Set(parsed.map((r) => r.qualificationName))];

  const [employees, existingQuals] = await Promise.all([
    prisma.employee.findMany({
      where: { employeeCode: { in: uniqueCodes } },
      select: { id: true, employeeCode: true },
    }),
    prisma.qualification.findMany({
      where: { name: { in: uniqueNames } },
      select: { id: true, name: true },
    }),
  ]);

  const employeeByCode = new Map(employees.map((e) => [e.employeeCode, e]));
  const qualByName = new Map(existingQuals.map((q) => [q.name, q]));

  // ── Step 3: 不足資格を一括作成（0〜2クエリ）────────────────────────────────
  const missingNames = uniqueNames.filter((n) => !qualByName.has(n));
  if (missingNames.length > 0) {
    await prisma.qualification.createMany({
      data: missingNames.map((name) => ({ name })),
      skipDuplicates: true,
    });
    const newQuals = await prisma.qualification.findMany({
      where: { name: { in: missingNames } },
      select: { id: true, name: true },
    });
    newQuals.forEach((q) => qualByName.set(q.name, q));
  }

  // ── Step 4: 操作リスト構築（DBアクセスなし）──────────────────────────────────
  type Op = {
    rowNum: number;
    employeeCode: string;
    qualificationName: string;
    employeeId: string;
    qualificationId: string;
    acquiredDate: Date | null;
    expiryDate: Date | null;
    certificateNumber: string | null;
  };
  const ops: Op[] = [];

  for (const r of parsed) {
    const employee = employeeByCode.get(r.employeeCode);
    if (!employee) {
      results.errors.push(`${r.rowNum}行目: 社員番号「${r.employeeCode}」の社員が見つかりません`);
      continue;
    }
    const qualification = qualByName.get(r.qualificationName);
    if (!qualification) {
      results.errors.push(`${r.rowNum}行目: 資格「${r.qualificationName}」の取得に失敗しました`);
      continue;
    }
    ops.push({ ...r, employeeId: employee.id, qualificationId: qualification.id });
  }

  if (ops.length === 0) return NextResponse.json(results);

  // ── Step 5: 既存レコードを一括取得（1クエリ）────────────────────────────────
  const empIds = [...new Set(ops.map((o) => o.employeeId))];
  const qualIds = [...new Set(ops.map((o) => o.qualificationId))];
  const existing = await prisma.employeeQualification.findMany({
    where: { employeeId: { in: empIds }, qualificationId: { in: qualIds } },
    select: { id: true, employeeId: true, qualificationId: true },
  });
  const existingMap = new Map(existing.map((r) => [`${r.employeeId}_${r.qualificationId}`, r.id]));

  const toCreate = ops.filter((op) => !existingMap.has(`${op.employeeId}_${op.qualificationId}`));
  const toUpdate = ops.filter((op) => existingMap.has(`${op.employeeId}_${op.qualificationId}`));

  // ── Step 6: 新規を一括INSERT（1クエリ）──────────────────────────────────────
  if (toCreate.length > 0) {
    await prisma.employeeQualification.createMany({
      data: toCreate.map((op) => ({
        employeeId: op.employeeId,
        qualificationId: op.qualificationId,
        acquiredDate: op.acquiredDate,
        expiryDate: op.expiryDate,
        certificateNumber: op.certificateNumber,
      })),
      skipDuplicates: true,
    });
    results.created = toCreate.length;
  }

  // ── Step 7: 更新をraw SQLで一括UPDATE（1クエリ）─────────────────────────────
  if (toUpdate.length > 0) {
    // VALUES ($1::text, $2::timestamptz, $3::timestamptz, $4::text), ...
    const placeholders: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    for (const op of toUpdate) {
      const id = existingMap.get(`${op.employeeId}_${op.qualificationId}`)!;
      placeholders.push(
        `($${pIdx++}::text, $${pIdx++}::timestamptz, $${pIdx++}::timestamptz, $${pIdx++}::text)`
      );
      params.push(id, op.acquiredDate, op.expiryDate, op.certificateNumber);
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "EmployeeQualification" AS eq
       SET "acquiredDate" = v.ad,
           "expiryDate"   = v.ed,
           "certificateNumber" = v.cn,
           "updatedAt"    = NOW()
       FROM (VALUES ${placeholders.join(",")}) AS v(id, ad, ed, cn)
       WHERE eq.id = v.id`,
      ...params
    );
    results.updated = toUpdate.length;
  }

  return NextResponse.json(results);
}
