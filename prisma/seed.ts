import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: "SOUMU" },
      update: {},
      create: { name: "総務部", code: "SOUMU", sortOrder: 1 },
    }),
    prisma.department.upsert({
      where: { code: "SEKOU_KANRI" },
      update: {},
      create: { name: "施工管理営業部", code: "SEKOU_KANRI", sortOrder: 2 },
    }),
    prisma.department.upsert({
      where: { code: "SEKOU" },
      update: {},
      create: { name: "施工部", code: "SEKOU", sortOrder: 3 },
    }),
    prisma.department.upsert({
      where: { code: "MAINTENANCE" },
      update: {},
      create: { name: "メンテナンス部", code: "MAINTENANCE", sortOrder: 4 },
    }),
    prisma.department.upsert({
      where: { code: "SHISHA" },
      update: {},
      create: { name: "SHISHA事業部", code: "SHISHA", sortOrder: 5 },
    }),
  ]);

  const [soumu, sekouKanri, sekou, maintenance, shisha] = departments;

  // Create positions
  const positions = await Promise.all([
    prisma.position.upsert({
      where: { id: "pos_ippan" },
      update: {},
      create: { id: "pos_ippan", name: "一般職", level: 1, sortOrder: 1 },
    }),
    prisma.position.upsert({
      where: { id: "pos_shusa" },
      update: {},
      create: { id: "pos_shusa", name: "主査（主任）", level: 2, sortOrder: 2 },
    }),
    prisma.position.upsert({
      where: { id: "pos_kakarichou" },
      update: {},
      create: { id: "pos_kakarichou", name: "係長", level: 3, sortOrder: 3 },
    }),
    prisma.position.upsert({
      where: { id: "pos_kachou" },
      update: {},
      create: { id: "pos_kachou", name: "課長", level: 4, sortOrder: 4 },
    }),
    prisma.position.upsert({
      where: { id: "pos_buchou" },
      update: {},
      create: { id: "pos_buchou", name: "部長", level: 5, sortOrder: 5 },
    }),
  ]);

  const [ippan, shusa, kakarichou, kachou] = positions;

  // Create employees based on Excel data
  const employeesData = [
    { code: "0006", lastName: "永谷", firstName: "香代子", dept: soumu, pos: ippan, grade: 3, step: 19, salary: 356000 },
    { code: "0007", lastName: "松浦", firstName: "孝行", dept: sekouKanri, pos: kachou, grade: 4, step: 15, salary: 380000 },
    { code: "0008", lastName: "矢山", firstName: "慧", dept: sekou, pos: ippan, grade: 2, step: 10, salary: 280000 },
    { code: "0009", lastName: "鈴木", firstName: "秀典", dept: soumu, pos: kachou, grade: 4, step: 20, salary: 420000 },
    { code: "0010", lastName: "吉村", firstName: "卓也", dept: sekouKanri, pos: kakarichou, grade: 3, step: 12, salary: 340000 },
    { code: "0011", lastName: "河居", firstName: "隆秀", dept: sekou, pos: shusa, grade: 3, step: 14, salary: 350000 },
    { code: "0012", lastName: "山城", firstName: "学", dept: maintenance, pos: ippan, grade: 2, step: 8, salary: 260000 },
    { code: "0013", lastName: "市原", firstName: "博", dept: sekou, pos: kakarichou, grade: 3, step: 16, salary: 360000 },
    { code: "0014", lastName: "宮前", firstName: "光希", dept: sekouKanri, pos: ippan, grade: 2, step: 6, salary: 240000 },
    { code: "0015", lastName: "濱根", firstName: "亜紀", dept: soumu, pos: ippan, grade: 2, step: 9, salary: 270000 },
    { code: "0016", lastName: "黒田", firstName: "悠介", dept: sekou, pos: ippan, grade: 1, step: 5, salary: 220000 },
    { code: "0017", lastName: "渡辺", firstName: "健太郎", dept: sekouKanri, pos: shusa, grade: 3, step: 11, salary: 330000 },
    { code: "0018", lastName: "光嶋", firstName: "遥稀", dept: maintenance, pos: ippan, grade: 1, step: 4, salary: 210000 },
    { code: "0019", lastName: "山本", firstName: "雄也", dept: sekou, pos: ippan, grade: 2, step: 7, salary: 250000 },
    { code: "0020", lastName: "西田", firstName: "将太", dept: shisha, pos: ippan, grade: 1, step: 3, salary: 200000 },
    { code: "0022", lastName: "織田", firstName: "英朗", dept: sekou, pos: ippan, grade: 1, step: 4, salary: 210000 },
    { code: "0023", lastName: "清井", firstName: "真吾", dept: maintenance, pos: shusa, grade: 3, step: 13, salary: 345000 },
    { code: "0024", lastName: "村井", firstName: "俊介", dept: sekouKanri, pos: ippan, grade: 2, step: 8, salary: 260000 },
    { code: "0025", lastName: "竹内", firstName: "智子", dept: soumu, pos: shusa, grade: 3, step: 15, salary: 355000 },
    { code: "0027", lastName: "大江", firstName: "健人", dept: shisha, pos: ippan, grade: 1, step: 2, salary: 195000 },
    { code: "0201", lastName: "西原", firstName: "凌", dept: sekou, pos: ippan, grade: 1, step: 3, salary: 200000 },
  ];

  const employees = [];
  for (const emp of employeesData) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: emp.code },
      update: {},
      create: {
        employeeCode: emp.code,
        lastName: emp.lastName,
        firstName: emp.firstName,
        departmentId: emp.dept.id,
        positionId: emp.pos.id,
        grade: emp.grade,
        salaryStep: emp.step,
        baseSalary: emp.salary,
        email: `${emp.code}@example.com`,
        isActive: true,
      },
    });
    employees.push(employee);
  }

  console.log(`Created ${employees.length} employees`);

  // Create users (admin, manager, general)
  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Find specific employees for user accounts
  const suzuki = employees.find((e) => e.employeeCode === "0009"); // 鈴木秀典 - 総務部課長
  const matsuura = employees.find((e) => e.employeeCode === "0007"); // 松浦孝行 - 施工管理営業部課長
  const nagatani = employees.find((e) => e.employeeCode === "0006"); // 永谷香代子 - 総務部一般

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminPassword,
      name: "管理者",
      role: "ADMIN",
      employeeId: suzuki?.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      passwordHash: managerPassword,
      name: "松浦 孝行",
      role: "MANAGER",
      employeeId: matsuura?.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      passwordHash: userPassword,
      name: "永谷 香代子",
      role: "GENERAL",
      employeeId: nagatani?.id,
    },
  });

  console.log("Created user accounts");

  // Create competency items
  // Company-wide items (全社共通)
  const companyWideItems = [
    {
      category: "全社共通",
      name: "社会性",
      description: "社会人としての基本的なマナーや規範を守り、組織の一員として適切な行動ができる",
      coefficient: 2,
      level1Text: "基本的なビジネスマナーが身についていない場面がある",
      level2Text: "基本的なビジネスマナーを理解し、概ね実践できている",
      level3Text: "高いビジネスマナーを持ち、周囲の模範となっている",
      level4Text: "優れたビジネスマナーで社内外から高い信頼を得ている",
      sortOrder: 1,
    },
    {
      category: "全社共通",
      name: "コミュニケーション力",
      description: "相手の話を傾聴し、自分の意見を適切に伝え、円滑な人間関係を構築できる",
      coefficient: 2,
      level1Text: "自分から積極的にコミュニケーションを取ることが少ない",
      level2Text: "必要なコミュニケーションは取れているが、積極性に欠ける",
      level3Text: "積極的にコミュニケーションを取り、チームワークに貢献している",
      level4Text: "優れたコミュニケーション力で組織全体の連携を促進している",
      sortOrder: 2,
    },
    {
      category: "全社共通",
      name: "責任性",
      description: "与えられた業務に対して責任感を持ち、最後までやり遂げることができる",
      coefficient: 2,
      level1Text: "業務の遂行に責任感が不足している場面がある",
      level2Text: "与えられた業務は概ね責任を持って遂行できている",
      level3Text: "高い責任感を持ち、困難な状況でも最後までやり遂げている",
      level4Text: "組織全体の成果に対して強い責任感を持ち、率先して行動している",
      sortOrder: 3,
    },
  ];

  for (const item of companyWideItems) {
    await prisma.competencyItem.upsert({
      where: { id: `comp_${item.name}` },
      update: {},
      create: {
        id: `comp_${item.name}`,
        ...item,
        departmentId: null,
        isActive: true,
      },
    });
  }

  // Department-specific items (職種共通)
  const deptSpecificItems = [
    {
      dept: soumu,
      category: "職種共通",
      name: "事務処理能力",
      description: "事務処理能力/サポート力/業務の段取り/社内管理業務",
      coefficient: 2,
      level1Text: "基本的な事務処理に時間がかかり、ミスが多い",
      level2Text: "定型的な事務処理は正確にこなせている",
      level3Text: "効率的に事務処理を行い、業務改善の提案もできる",
      level4Text: "高度な事務処理能力で部門全体の業務効率化をリードしている",
    },
    {
      dept: sekouKanri,
      category: "職種共通",
      name: "提案力",
      description: "提案力/調整力/顧客対応力",
      coefficient: 2,
      level1Text: "顧客への提案が消極的で、受け身の対応が多い",
      level2Text: "基本的な提案はできるが、顧客ニーズの深掘りが不足",
      level3Text: "顧客ニーズを的確に把握し、効果的な提案ができている",
      level4Text: "革新的な提案で顧客の期待を超え、高い満足度を実現している",
    },
    {
      dept: sekou,
      category: "職種共通",
      name: "技術力",
      description: "技術力/安全意識/作業効率",
      coefficient: 2,
      level1Text: "基本的な技術の習得が不十分で、指導が必要",
      level2Text: "基本的な技術は身についているが、応用力に課題がある",
      level3Text: "高い技術力を持ち、安全かつ効率的に作業を遂行している",
      level4Text: "卓越した技術力で後輩の指導もでき、現場全体の品質向上に貢献",
    },
    {
      dept: maintenance,
      category: "職種共通",
      name: "技術力（メンテナンス）",
      description: "技術力/安全意識/作業効率",
      coefficient: 2,
      level1Text: "基本的なメンテナンス技術の習得が不十分",
      level2Text: "定型的なメンテナンス作業は正確にこなせている",
      level3Text: "高い技術力で複雑なメンテナンスにも対応できる",
      level4Text: "卓越した技術力でメンテナンス品質の向上をリードしている",
    },
    {
      dept: shisha,
      category: "職種共通",
      name: "商品・ブランド理解力",
      description: "商品・ブランド理解力/接客力・顧客体験向上",
      coefficient: 2,
      level1Text: "商品知識が不十分で、顧客対応に課題がある",
      level2Text: "基本的な商品知識はあるが、ブランド訴求力が弱い",
      level3Text: "豊富な商品知識で顧客体験の向上に貢献している",
      level4Text: "ブランド価値を最大限に活かし、卓越した顧客体験を提供している",
    },
  ];

  for (const item of deptSpecificItems) {
    await prisma.competencyItem.upsert({
      where: { id: `comp_dept_${item.dept.code}` },
      update: {},
      create: {
        id: `comp_dept_${item.dept.code}`,
        category: item.category,
        name: item.name,
        description: item.description,
        coefficient: item.coefficient,
        level1Text: item.level1Text,
        level2Text: item.level2Text,
        level3Text: item.level3Text,
        level4Text: item.level4Text,
        departmentId: item.dept.id,
        sortOrder: 4,
        isActive: true,
      },
    });
  }

  // Position-specific item (役職共通)
  await prisma.competencyItem.upsert({
    where: { id: "comp_judgment" },
    update: {},
    create: {
      id: "comp_judgment",
      category: "役職共通",
      name: "判断力",
      description: "状況を的確に判断し、適切な意思決定ができる",
      coefficient: 2,
      level1Text: "判断に迷うことが多く、上司の指示を仰ぐことが多い",
      level2Text: "定型的な業務については適切な判断ができている",
      level3Text: "複雑な状況でも的確な判断ができ、チームを適切にリードしている",
      level4Text: "卓越した判断力で組織全体の意思決定の質を高めている",
      departmentId: null,
      sortOrder: 5,
      isActive: true,
    },
  });

  console.log("Created competency items");

  // Create evaluation period
  await prisma.evaluationPeriod.upsert({
    where: { id: "period_2025_first" },
    update: {},
    create: {
      id: "period_2025_first",
      name: "令和7年度 前期",
      assessmentStartDate: new Date("2025-03-21"),
      assessmentEndDate: new Date("2025-09-20"),
      evaluationStartDate: new Date("2025-03-21"),
      evaluationEndDate: new Date("2026-03-20"),
      half: "FIRST",
      year: 2025,
      isActive: true,
    },
  });

  console.log("Created evaluation period");

  // Create some sample qualifications
  const qualifications = [
    { name: "1級建築施工管理技士", category: "建設" },
    { name: "2級建築施工管理技士", category: "建設" },
    { name: "1級土木施工管理技士", category: "建設" },
    { name: "2級土木施工管理技士", category: "建設" },
    { name: "建築士（一級）", category: "建設" },
    { name: "建築士（二級）", category: "建設" },
    { name: "電気工事士（第一種）", category: "電気" },
    { name: "電気工事士（第二種）", category: "電気" },
    { name: "危険物取扱者（乙種4類）", category: "安全" },
    { name: "衛生管理者（第一種）", category: "安全" },
    { name: "フォークリフト運転技能者", category: "運転" },
    { name: "玉掛け技能者", category: "建設" },
    { name: "日商簿記2級", category: "事務" },
    { name: "日商簿記3級", category: "事務" },
    { name: "普通自動車免許", category: "運転" },
  ];

  for (const qual of qualifications) {
    await prisma.qualification.upsert({
      where: { id: `qual_${qual.name}` },
      update: {},
      create: {
        id: `qual_${qual.name}`,
        name: qual.name,
        category: qual.category,
      },
    });
  }

  console.log("Created qualifications");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
