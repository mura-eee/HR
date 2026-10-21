const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Excelの日付シリアル値を変換
function excelDateToJSDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

function formatDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toLocaleDateString('ja-JP');
  return d;
}

async function main() {
  // DBから全社員取得
  const dbEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      id: true,
      employeeCode: true,
      lastName: true,
      firstName: true,
      lastNameKana: true,
      firstNameKana: true,
      email: true,
      phone: true,
      hireDate: true,
      birthDate: true,
      gender: true,
      address: true,
      healthInsuranceNumber: true,
      healthInsuranceAcquiredDate: true,
      basicPensionNumber: true,
      employmentInsuranceNumber: true,
      employmentInsuranceAcquiredDate: true,
      grade: true,
      salaryStep: true,
      company: { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: { employeeCode: 'asc' }
  });

  // Excelファイル読込
  const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/労務/09_従業員情報/04_各種管理表/01_社員リスト（事務連絡票）.xlsx';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['従業員リスト'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  
  // データ行（行3以降＝index2以降）
  const excelEmployees = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[7]) continue; // 氏名なし行はスキップ
    excelEmployees.push({
      rowNum: row[0],
      company: row[1],
      healthInsNo: row[4],
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
      employInsNo: row[23],
      pensionNo: row[25],
    });
  }

  console.log(`Excel社員数: ${excelEmployees.length}名`);
  console.log(`DB社員数: ${dbEmployees.length}名\n`);

  // 氏名で突合
  const matchResults = [];
  
  for (const db of dbEmployees) {
    const fullName = `${db.lastName}${db.firstName}`;
    // スペースあり/なし両方で検索
    const excelMatch = excelEmployees.find(e => {
      const eName = e.name.replace(/[　\s]/g, '');
      return eName === fullName;
    });
    
    const missingInDB = [];
    const availableFromExcel = [];
    
    if (!db.phone) missingInDB.push('電話番号');
    if (!db.healthInsuranceNumber) missingInDB.push('健保番号');
    if (!db.healthInsuranceAcquiredDate) missingInDB.push('健保加入日');
    if (!db.basicPensionNumber) missingInDB.push('基礎年金番号');
    if (!db.employmentInsuranceNumber) missingInDB.push('雇用保険番号');
    if (!db.employmentInsuranceAcquiredDate) missingInDB.push('雇保加入日');
    if (!db.grade) missingInDB.push('等級');
    if (!db.salaryStep) missingInDB.push('号俸');
    
    if (excelMatch) {
      if (!db.phone && excelMatch.phone) availableFromExcel.push(`電話番号: ${excelMatch.phone}`);
      if (!db.healthInsuranceNumber && excelMatch.healthInsNo) availableFromExcel.push(`健保番号: ${excelMatch.healthInsNo}`);
      if (!db.healthInsuranceAcquiredDate && excelMatch.healthInsDate) availableFromExcel.push(`健保加入日: ${formatDate(excelMatch.healthInsDate)}`);
      if (!db.basicPensionNumber && excelMatch.pensionNo) availableFromExcel.push(`基礎年金番号: ${excelMatch.pensionNo}`);
      if (!db.employmentInsuranceNumber && excelMatch.employInsNo) availableFromExcel.push(`雇用保険番号: ${excelMatch.employInsNo}`);
      if (!db.employmentInsuranceAcquiredDate && excelMatch.employInsDate) availableFromExcel.push(`雇保加入日: ${formatDate(excelMatch.employInsDate)}`);
    }
    
    if (missingInDB.length > 0) {
      matchResults.push({
        code: db.employeeCode,
        name: fullName,
        company: db.company?.name || '不明',
        found: !!excelMatch,
        missingInDB,
        availableFromExcel,
        noExcelSource: missingInDB.filter(f => !['等級', '号俸'].includes(f) && !availableFromExcel.some(a => a.startsWith(f)))
      });
    }
  }

  // Excel に存在しないDB社員
  const notInExcel = dbEmployees.filter(db => {
    const fullName = `${db.lastName}${db.firstName}`;
    return !excelEmployees.find(e => e.name.replace(/[　\s]/g, '') === fullName);
  });

  console.log('【DBに不足があり、Excelから補完できる社員】');
  console.log('='.repeat(80));
  for (const r of matchResults.filter(r => r.found && r.availableFromExcel.length > 0)) {
    console.log(`[${r.code}] ${r.name} (${r.company})`);
    console.log(`  DBに不足: ${r.missingInDB.join(', ')}`);
    console.log(`  Excelから取得可能: ${r.availableFromExcel.join(' | ')}`);
  }
  
  console.log('\n【DBに不足があるがExcelにデータなし（等級・号俸除く）】');
  console.log('='.repeat(80));
  for (const r of matchResults.filter(r => r.noExcelSource.filter(f => !['等級', '号俸'].includes(f)).length > 0)) {
    console.log(`[${r.code}] ${r.name} (${r.company}): ${r.noExcelSource.join(', ')}`);
  }
  
  console.log('\n【等級・号俸が未設定の社員】');
  console.log('='.repeat(80));
  for (const r of matchResults.filter(r => r.missingInDB.includes('等級') || r.missingInDB.includes('号俸'))) {
    console.log(`[${r.code}] ${r.name} (${r.company})`);
  }
  
  console.log('\n【DBにあるがExcelの管理表に見つからない社員】');
  console.log('='.repeat(80));
  for (const emp of notInExcel) {
    console.log(`[${emp.employeeCode}] ${emp.lastName}${emp.firstName} (${emp.company?.name || '不明'})`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
