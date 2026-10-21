const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
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

  console.log(`DB社員数: ${employees.length}名\n`);

  const missingFields = [];
  
  for (const emp of employees) {
    const name = `${emp.lastName}${emp.firstName}`;
    const missing = [];
    
    if (!emp.lastNameKana || !emp.firstNameKana) missing.push('フリガナ');
    if (!emp.email) missing.push('メール');
    if (!emp.phone) missing.push('電話番号');
    if (!emp.hireDate) missing.push('入社日');
    if (!emp.birthDate) missing.push('生年月日');
    if (!emp.gender) missing.push('性別');
    if (!emp.address) missing.push('住所');
    if (!emp.healthInsuranceNumber) missing.push('健保番号');
    if (!emp.healthInsuranceAcquiredDate) missing.push('健保加入日');
    if (!emp.basicPensionNumber) missing.push('基礎年金番号');
    if (!emp.employmentInsuranceNumber) missing.push('雇用保険番号');
    if (!emp.employmentInsuranceAcquiredDate) missing.push('雇保加入日');
    if (!emp.department) missing.push('部署');
    if (!emp.grade) missing.push('等級');
    if (!emp.salaryStep) missing.push('号俸');
    
    if (missing.length > 0) {
      missingFields.push({
        code: emp.employeeCode,
        name,
        company: emp.company?.name || '不明',
        missing: missing.join(', ')
      });
    }
  }

  console.log('【不足情報がある社員】');
  console.log('='.repeat(80));
  for (const emp of missingFields) {
    console.log(`[${emp.code}] ${emp.name} (${emp.company})`);
    console.log(`  不足: ${emp.missing}`);
  }
  
  console.log(`\n合計: ${missingFields.length}名に不足あり（全${employees.length}名中）`);

  await prisma.$disconnect();
}

main().catch(console.error);
