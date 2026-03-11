import { prisma } from "@/lib/prisma";

/** 全テーブルのデータを収集してバックアップオブジェクトを返す */
export async function collectBackupData() {
  const [
    users,
    companies,
    jobTypes,
    departments,
    positions,
    qualifications,
    employees,
    employeeQualifications,
    evaluationPeriods,
    competencyItems,
    evaluations,
    competencyEvaluations,
    kpiGoals,
    fieldPermissions,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.company.findMany(),
    prisma.jobType.findMany(),
    prisma.department.findMany(),
    prisma.position.findMany(),
    prisma.qualification.findMany(),
    prisma.employee.findMany(),
    prisma.employeeQualification.findMany(),
    prisma.evaluationPeriod.findMany(),
    prisma.competencyItem.findMany(),
    prisma.evaluation.findMany(),
    prisma.competencyEvaluation.findMany(),
    prisma.kpiGoal.findMany(),
    prisma.fieldPermission.findMany(),
  ]);

  return {
    version: "1.0",
    users,
    companies,
    jobTypes,
    departments,
    positions,
    qualifications,
    employees,
    employeeQualifications,
    evaluationPeriods,
    competencyItems,
    evaluations,
    competencyEvaluations,
    kpiGoals,
    fieldPermissions,
  };
}

/** バックアップデータからDBを復元する */
export async function restoreFromData(data: ReturnType<typeof collectBackupData> extends Promise<infer T> ? T : never) {
  await prisma.$transaction(
    async (tx) => {
      // ===== 削除（依存順に逆から） =====
      await tx.competencyEvaluation.deleteMany({});
      await tx.kpiGoal.deleteMany({});
      await tx.evaluation.deleteMany({});
      await tx.employeeQualification.deleteMany({});
      // User-Employee 循環参照を解除してから削除
      await tx.user.updateMany({ data: { employeeId: null } });
      await tx.user.deleteMany({});
      await tx.employee.deleteMany({});
      await tx.competencyItem.deleteMany({});
      await tx.evaluationPeriod.deleteMany({});
      await tx.fieldPermission.deleteMany({});
      await tx.qualification.deleteMany({});
      await tx.position.deleteMany({});
      // 部署の自己参照を解除してから削除
      await tx.department.updateMany({ data: { parentDepartmentId: null } });
      await tx.department.deleteMany({});
      await tx.company.deleteMany({});
      await tx.jobType.deleteMany({});

      // ===== 挿入（依存順に） =====
      if (data.companies.length) await tx.company.createMany({ data: data.companies.map(({ ...r }) => r) });
      if (data.jobTypes.length) await tx.jobType.createMany({ data: data.jobTypes.map(({ ...r }) => r) });

      // 部署: まず parentDepartmentId なしで挿入し、後で更新
      if (data.departments.length) {
        await tx.department.createMany({
          data: data.departments.map(({ parentDepartmentId: _, ...r }) => ({ ...r, parentDepartmentId: null })),
        });
        for (const dept of data.departments) {
          if (dept.parentDepartmentId) {
            await tx.department.update({ where: { id: dept.id }, data: { parentDepartmentId: dept.parentDepartmentId } });
          }
        }
      }

      if (data.positions.length) await tx.position.createMany({ data: data.positions.map(({ ...r }) => r) });
      if (data.qualifications.length) await tx.qualification.createMany({ data: data.qualifications.map(({ ...r }) => r) });
      if (data.evaluationPeriods.length) await tx.evaluationPeriod.createMany({ data: data.evaluationPeriods.map(({ ...r }) => r) });
      if (data.competencyItems.length) await tx.competencyItem.createMany({ data: data.competencyItems.map(({ ...r }) => r) });
      if (data.employees.length) await tx.employee.createMany({ data: data.employees.map(({ ...r }) => r) });

      // User: まず employeeId なしで挿入し、後で更新
      if (data.users.length) {
        await tx.user.createMany({
          data: data.users.map(({ employeeId: _, ...r }) => ({ ...r, employeeId: null })),
        });
        for (const user of data.users) {
          if (user.employeeId) {
            await tx.user.update({ where: { id: user.id }, data: { employeeId: user.employeeId } });
          }
        }
      }

      if (data.employeeQualifications.length) await tx.employeeQualification.createMany({ data: data.employeeQualifications.map(({ ...r }) => r) });
      if (data.evaluations.length) await tx.evaluation.createMany({ data: data.evaluations.map(({ ...r }) => r) });
      if (data.competencyEvaluations.length) await tx.competencyEvaluation.createMany({ data: data.competencyEvaluations.map(({ ...r }) => r) });
      if (data.kpiGoals.length) await tx.kpiGoal.createMany({ data: data.kpiGoals.map(({ ...r }) => r) });
      if (data.fieldPermissions.length) await tx.fieldPermission.createMany({ data: data.fieldPermissions.map(({ ...r }) => r) });
    },
    { timeout: 120000 }
  );
}
