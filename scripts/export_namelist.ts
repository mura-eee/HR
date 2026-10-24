import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      company: { select: { name: true, sortOrder: true } },
      department: {
        select: {
          name: true,
          parentDepartment: { select: { name: true } },
        },
      },
      position: { select: { name: true } },
      jobType: { select: { name: true } },
    },
    orderBy: [{ employeeCode: "asc" }],
  });

  // Sort by company sortOrder then employeeCode
  employees.sort((a, b) => {
    const ao = a.company?.sortOrder ?? 99;
    const bo = b.company?.sortOrder ?? 99;
    if (ao !== bo) return ao - bo;
    return a.employeeCode.localeCompare(b.employeeCode);
  });

  const rows: string[][] = [
    ["No", "計上会社", "勤務先", "部署", "班・グループ", "役職・職種", "氏名", "雇用区分", "備考"],
  ];

  employees.forEach((emp, i) => {
    const dept = emp.department;
    const bumon = dept?.parentDepartment?.name ?? dept?.name ?? "";
    const han = dept?.parentDepartment ? (dept?.name ?? "") : "";
    const yakushoku = emp.position?.name ?? "";
    const koyou = emp.jobType?.name ?? "";
    rows.push([
      String(i + 1),
      emp.company?.name ?? "",
      emp.company?.name ?? "",
      bumon,
      han,
      yakushoku,
      `${emp.lastName} ${emp.firstName}`,
      koyou,
      "",
    ]);
  });

  console.log(JSON.stringify(rows));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
