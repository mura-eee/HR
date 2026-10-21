const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function excelDateToJSDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

async function main() {
  const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/労務/09_従業員情報/04_各種管理表/01_社員リスト（事務連絡票）.xlsx';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['従業員リスト'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // 対象4名の氏名
  const targets = [
    { code: '0038', name: '川野拓海' },
    { code: '0039', name: '板垣麗香' },
    { code: '0040', name: '上中別府晃' },
    { code: '0043', name: '安達伸光' },
  ];

  for (const target of targets) {
    // Excelで氏名検索
    const row = rows.find(r => r[7] && r[7].replace(/[　\s]/g, '') === target.name);
    if (!row) {
      console.log(`❌ ${target.name}: Excelに見つからず`);
      continue;
    }

    const updateData = {};
    if (row[25]) updateData.basicPensionNumber = String(row[25]);
    if (row[23]) updateData.employmentInsuranceNumber = String(row[23]);
    if (row[17]) {
      const d = excelDateToJSDate(row[17]);
      if (d) updateData.employmentInsuranceAcquiredDate = d;
    }

    const result = await prisma.employee.update({
      where: { employeeCode: target.code },
      data: updateData,
    });

    console.log(`✅ [${target.code}] ${target.name}`);
    if (updateData.basicPensionNumber) console.log(`   基礎年金番号: ${updateData.basicPensionNumber}`);
    if (updateData.employmentInsuranceNumber) console.log(`   雇用保険番号: ${updateData.employmentInsuranceNumber}`);
    if (updateData.employmentInsuranceAcquiredDate) console.log(`   雇保加入日: ${updateData.employmentInsuranceAcquiredDate.toLocaleDateString('ja-JP')}`);
  }

  console.log('\n取込完了');
  await prisma.$disconnect();
}

main().catch(console.error);
