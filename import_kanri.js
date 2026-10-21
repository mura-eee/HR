const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function excelDateToJSDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date(Math.floor(serial - 25569) * 86400 * 1000);
}

async function main() {
  const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/村井/01_経営企画/15_事業展開/02_関東/01_(有)下水管理興業/01_M&A後/03_社員情報/社員管理表R3.6.10.xlsx';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['群銀'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // 氏名 → コードのマッピング（名前突合）
  const nameToCode = {
    '深澤圭司': '1001', '深澤悟': '1002', '金沢秀彦': '1003',
    '河井義夫': '1004', '糸谷徹寛': '1005', '岡本裕文': '1006',
    '小田切宏治': '1007', '阿部晃奈': '1008', '市川堅二': '1009',
    '佐藤大和': '1010', '栗原和江': '1101', '渡邉浩利': '1102',
  };

  let updated = 0;
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[3]) continue;
    const name = row[3].replace(/[　\s]/g, '');
    const code = nameToCode[name];
    if (!code) continue;

    const emp = await prisma.employee.findUnique({ where: { employeeCode: code } });
    if (!emp) continue;

    const update = {};
    const changes = [];

    // 血液型
    if (!emp.bloodType && row[7]) {
      update.bloodType = String(row[7]);
      changes.push(`血液型: ${row[7]}`);
    }
    // 電話番号（携帯 col15）
    if (!emp.phone && row[15]) {
      update.phone = String(row[15]);
      changes.push(`電話: ${row[15]}`);
    }
    // 雇用保険番号（col12）
    if (!emp.employmentInsuranceNumber && row[12] && row[12] !== '-') {
      update.employmentInsuranceNumber = String(row[12]);
      changes.push(`雇用保険番号: ${row[12]}`);
    }
    // 住所（col13 郵便番号 + col14 住所）
    if (!emp.address && row[14]) {
      const addr = row[13] ? `〒${row[13]} ${row[14]}` : row[14];
      update.address = addr;
      changes.push(`住所: ${addr}`);
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
  console.log(`\n完了: ${updated}名更新`);
  await prisma.$disconnect();
}

main().catch(console.error);
