const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function excelDateToJSDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date(Math.floor(serial - 25569) * 86400 * 1000);
}

function parseRow(row) {
  return {
    personalCode: row[6],
    name: row[7],
    nameKana: row[8],
    gender: row[9],
    birthDate: excelDateToJSDate(row[10]),
    postalCode: row[13],
    address: row[14],
    phone: row[16],
    employInsDate: excelDateToJSDate(row[17]),
    healthInsDate: excelDateToJSDate(row[18]),
    healthInsNo: row[4],
    employInsNo: row[23],
    pensionNo: row[25],
  };
}

async function main() {
  const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/村井/01_経営企画/15_事業展開/02_関東/01_(有)下水管理興業/01_M&A後/03_社員情報/01_社員リスト.xlsx';
  const wb = XLSX.readFile(filePath);

  // メインシートと保険未加入者シートの両方からデータ取得
  const allRows = [];
  for (const sheetName of ['従業員リスト', '従業員リスト (保険未加入者)']) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (row[6] && row[7]) allRows.push(parseRow(row));
    }
  }

  console.log(`Excelから${allRows.length}名分のデータを読み込み\n`);

  let updated = 0, skipped = 0;

  for (const excelData of allRows) {
    const code = String(excelData.personalCode).padStart(4, '0');
    const emp = await prisma.employee.findUnique({ where: { employeeCode: code } });

    if (!emp) {
      console.log(`⚠️  [${code}] ${excelData.name} — DBに存在しないためスキップ`);
      skipped++;
      continue;
    }

    const update = {};
    const changes = [];

    if (!emp.phone && excelData.phone) {
      update.phone = String(excelData.phone);
      changes.push(`電話: ${excelData.phone}`);
    }
    if (!emp.address && excelData.address) {
      const addr = excelData.postalCode ? `〒${excelData.postalCode} ${excelData.address}` : excelData.address;
      update.address = addr;
      changes.push(`住所: ${addr}`);
    }
    if (!emp.healthInsuranceNumber && excelData.healthInsNo) {
      update.healthInsuranceNumber = String(excelData.healthInsNo);
      changes.push(`健保番号: ${excelData.healthInsNo}`);
    }
    if (!emp.healthInsuranceAcquiredDate && excelData.healthInsDate) {
      update.healthInsuranceAcquiredDate = excelData.healthInsDate;
      changes.push(`健保加入日: ${excelData.healthInsDate.toLocaleDateString('ja-JP')}`);
    }
    if (!emp.employmentInsuranceNumber && excelData.employInsNo) {
      update.employmentInsuranceNumber = String(excelData.employInsNo);
      changes.push(`雇用保険番号: ${excelData.employInsNo}`);
    }
    if (!emp.employmentInsuranceAcquiredDate && excelData.employInsDate) {
      update.employmentInsuranceAcquiredDate = excelData.employInsDate;
      changes.push(`雇保加入日: ${excelData.employInsDate.toLocaleDateString('ja-JP')}`);
    }
    if (!emp.basicPensionNumber && excelData.pensionNo) {
      update.basicPensionNumber = String(excelData.pensionNo);
      changes.push(`基礎年金番号: ${excelData.pensionNo}`);
    }
    if (!emp.gender && excelData.gender) {
      update.gender = excelData.gender === '男' ? 'male' : 'female';
      changes.push(`性別: ${excelData.gender}`);
    }

    if (Object.keys(update).length > 0) {
      await prisma.employee.update({ where: { employeeCode: code }, data: update });
      console.log(`✅ [${code}] ${emp.lastName}${emp.firstName}`);
      changes.forEach(c => console.log(`   ${c}`));
      updated++;
    } else {
      console.log(`✓  [${code}] ${emp.lastName}${emp.firstName} — 追加項目なし`);
    }
  }

  console.log(`\n完了: ${updated}名更新, ${skipped}名スキップ`);
  await prisma.$disconnect();
}

main().catch(console.error);
