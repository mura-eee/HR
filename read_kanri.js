const XLSX = require('xlsx');
const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/村井/01_経営企画/15_事業展開/02_関東/01_(有)下水管理興業/01_M&A後/03_社員情報/社員管理表R3.6.10.xlsx';
const wb = XLSX.readFile(filePath);
console.log('シート:', wb.SheetNames);

for (const name of wb.SheetNames.slice(0, 3)) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  console.log(`\n===== ${name} (${data.length}行) =====`);
  for (let i = 0; i < Math.min(4, data.length); i++) {
    console.log(`行${i+1}:`, JSON.stringify(data[i]));
  }
}
