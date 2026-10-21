const XLSX = require('xlsx');

const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/労務/09_従業員情報/04_各種管理表/01_社員リスト（事務連絡票）.xlsx';
const wb = XLSX.readFile(filePath);

// 全シートの社員データを取得
const sheetName = '従業員リスト';
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

// ヘッダー行（行2＝index1）
const header = data[1];
console.log('列ヘッダー:');
header.forEach((h, i) => {
  if (h) console.log(`  [${i}] ${h.toString().replace(/\r\n/g, ' / ')}`);
});
