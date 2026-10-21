const XLSX = require('xlsx');
const filePath = 'C:/Users/村井俊介/OneDrive - 株式会社トキト/村井/01_経営企画/15_事業展開/02_関東/01_(有)下水管理興業/01_M&A後/03_社員情報/社員管理表R3.6.10.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['群銀'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

console.log('全データ:');
for (let i = 0; i < data.length; i++) {
  if (data[i].some(v => v !== null)) {
    console.log(`行${i+1}:`, JSON.stringify(data[i]));
  }
}
