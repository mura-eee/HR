const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function excelDateToJSDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date(Math.floor(serial - 25569) * 86400 * 1000);
}

// 半角カタカナ→全角変換
function toFullWidth(str) {
  if (!str) return '';
  const halfKana = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ';
  const fullKana = 'ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン゛゜';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const idx = halfKana.indexOf(str[i]);
    if (idx >= 0) {
      if (str[i] === 'ﾞ' && result.length > 0) {
        // 濁点処理は簡略化
        result += fullKana[idx];
      } else if (str[i] === 'ﾟ' && result.length > 0) {
        result += fullKana[idx];
      } else {
        result += fullKana[idx];
      }
    } else {
      result += str[i];
    }
  }
  return result;
}

function splitKana(kana) {
  const full = toFullWidth(kana || '');
  const parts = full.trim().split(/\s+/);
  return { lastName: parts[0] || '', firstName: parts[1] || '' };
}

async function main() {
  // トキト会社IDを取得
  const tokito = await prisma.company.findFirst({ where: { name: { contains: 'トキト' } } });
  console.log('トキト:', tokito?.name, tokito?.id);

  // =====================
  // 1. 5名の新規登録
  // =====================
  const newEmployees = [
    {
      employeeCode: '0044',
      lastName: '山本', firstName: '哲也',
      lastNameKana: 'ヤマモト', firstNameKana: 'テツヤ',
      gender: 'male',
      birthDate: excelDateToJSDate(35381),
      hireDate: excelDateToJSDate(46224),
      address: '〒599-8241 大阪府堺市中区福田482-1　デイジーメゾン１　205',
      phone: '090-6329-2369',
      healthInsuranceNumber: '107',
      healthInsuranceAcquiredDate: excelDateToJSDate(46224),
      employmentInsuranceNumber: '5115-926823-0',
      employmentInsuranceAcquiredDate: excelDateToJSDate(46224),
    },
    {
      employeeCode: '0045',
      lastName: '島田', firstName: '里穂',
      lastNameKana: 'シマダ', firstNameKana: 'リホ',
      gender: 'female',
      birthDate: excelDateToJSDate(35940),
      hireDate: excelDateToJSDate(46224),
      address: '〒599-8238 大阪府堺市中区土師町１－２５－１　ルシエルメイキラB棟　103',
      phone: '090-6059-0916',
      healthInsuranceNumber: '108',
      healthInsuranceAcquiredDate: excelDateToJSDate(46224),
      basicPensionNumber: '4261-247327',
    },
    {
      employeeCode: '0046',
      lastName: '原島', firstName: '大樹',
      lastNameKana: 'ハラシマ', firstNameKana: 'ダイキ',
      gender: 'male',
      birthDate: excelDateToJSDate(32696),
      hireDate: excelDateToJSDate(46224),
      address: '〒590-0062 大阪府堺市堺区北安井町1番23号　サンシャインB-303号',
      phone: '080-9322-9622',
      healthInsuranceAcquiredDate: excelDateToJSDate(46224),
    },
    {
      employeeCode: '0049',
      lastName: '兵頭', firstName: '隆路',
      lastNameKana: 'ヒョウドウ', firstNameKana: 'リュウジ',
      gender: 'male',
      birthDate: excelDateToJSDate(34646),
      hireDate: excelDateToJSDate(46255),
      address: '〒594-0023 大阪府和泉市伯太町1-13-7　ももちゃんヒルズ和泉605',
      phone: '080-2756-2295',
      employmentInsuranceNumber: '5105-463630-4',
      employmentInsuranceAcquiredDate: excelDateToJSDate(46255),
      basicPensionNumber: '7583-186717',
    },
    {
      employeeCode: '0050',
      lastName: '佐藤', firstName: '大介',
      lastNameKana: 'サトウ', firstNameKana: 'ダイスケ',
      gender: 'male',
      birthDate: excelDateToJSDate(32494),
      hireDate: excelDateToJSDate(46306),
      address: '〒591-8033 大阪府堺市北区百舌鳥西之町2丁194-2',
      phone: '080-1441-8453',
      employmentInsuranceAcquiredDate: excelDateToJSDate(46306),
    },
  ];

  for (const emp of newEmployees) {
    const created = await prisma.employee.create({
      data: { ...emp, companyId: tokito.id }
    });
    console.log(`✅ 登録: [${created.employeeCode}] ${created.lastName}${created.firstName}`);
  }

  // =====================
  // 2. 濱根亜紀 → 樹亜紀 氏名変更
  // =====================
  const hamazone = await prisma.employee.findFirst({
    where: { lastName: '濱根', firstName: '亜紀' }
  });

  if (!hamazone) {
    console.log('❌ 濱根亜紀が見つかりません');
  } else {
    // 旧氏名を履歴に保存
    await prisma.employeeNameHistory.create({
      data: {
        employeeId: hamazone.id,
        lastName: hamazone.lastName,
        firstName: hamazone.firstName,
        changedAt: new Date(),
        reason: '旧姓（結婚前）',
      }
    });

    // 氏名・カナ・住所・保険番号を更新（Excelの情報で補完）
    await prisma.employee.update({
      where: { id: hamazone.id },
      data: {
        lastName: '樹',
        firstName: '亜紀',
        lastNameKana: 'ウエキ',
        firstNameKana: 'アキ',
        // 不足情報があれば補完
        ...(!hamazone.address ? { address: '〒591-8021 大阪府堺市北区新金岡町５丁９番３０８号　ブランノワール１０５号' } : {}),
        ...(!hamazone.healthInsuranceNumber ? { healthInsuranceNumber: '70' } : {}),
        ...(!hamazone.healthInsuranceAcquiredDate ? { healthInsuranceAcquiredDate: excelDateToJSDate(44440) } : {}),
        ...(!hamazone.employmentInsuranceNumber ? { employmentInsuranceNumber: '5090-589782-4' } : {}),
        ...(!hamazone.employmentInsuranceAcquiredDate ? { employmentInsuranceAcquiredDate: excelDateToJSDate(44440) } : {}),
        ...(!hamazone.basicPensionNumber ? { basicPensionNumber: '1254-534853' } : {}),
      }
    });
    console.log(`✅ 氏名変更: 濱根亜紀 → 樹亜紀（旧姓を履歴に保存）`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
