import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerCompanyId } from "@/lib/server-company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, ClipboardCheck, Award, TrendingUp, Clock } from "lucide-react";

const statusLabels: Record<string, string> = {
  DRAFT: "下書き",
  SELF_EVAL: "自己評価中",
  FIRST_EVAL: "1次評価中",
  SECOND_EVAL: "2次評価中",
  COMPLETED: "完了",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SELF_EVAL: "bg-yellow-100 text-yellow-800",
  FIRST_EVAL: "bg-blue-100 text-blue-800",
  SECOND_EVAL: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const companyId = await getServerCompanyId();
  const companyFilter = companyId ? { companyId } : {};

  const [
    totalEmployees,
    totalDepartments,
    activeEvaluations,
    totalQualifications,
    departmentBreakdown,
    recentEvaluations,
  ] = await Promise.all([
    prisma.employee.count({ where: { isActive: true, ...companyFilter } }),
    prisma.department.count(),
    prisma.evaluation.count({
      where: {
        status: { not: "COMPLETED" },
        ...(companyId ? { employee: { companyId } } : {}),
      },
    }),
    prisma.employeeQualification.count({
      where: companyId ? { employee: { companyId } } : {},
    }),
    prisma.department.findMany({
      select: {
        name: true,
        _count: {
          select: { employees: { where: { isActive: true, ...companyFilter } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.evaluation.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      where: companyId ? { employee: { companyId } } : {},
      include: {
        employee: { select: { lastName: true, firstName: true } },
        period: { select: { name: true } },
      },
    }),
  ]);

  const breakdown = departmentBreakdown
    .filter((d) => d._count.employees > 0)
    .map((d) => ({ name: d.name, count: d._count.employees }));

  const recent = recentEvaluations.map((e) => ({
    id: e.id,
    employeeName: `${e.employee.lastName} ${e.employee.firstName}`,
    status: e.status,
    periodName: e.period.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">
          ようこそ、{session.user?.name}さん
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">社員数</p>
                <p className="text-3xl font-bold">{totalEmployees}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">部署数</p>
                <p className="text-3xl font-bold">{totalDepartments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">進行中の評価</p>
                <p className="text-3xl font-bold">{activeEvaluations}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">登録資格数</p>
                <p className="text-3xl font-bold">{totalQualifications}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              部署別人数
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.length > 0 ? (
              <div className="space-y-3">
                {breakdown.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <span className="text-sm">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (dept.count / (totalEmployees || 1)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {dept.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">データがありません</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5" />
              最近の評価
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length > 0 ? (
              <div className="space-y-3">
                {recent.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{evaluation.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{evaluation.periodName}</p>
                    </div>
                    <Badge
                      className={statusColors[evaluation.status] || ""}
                      variant="secondary"
                    >
                      {statusLabels[evaluation.status] || evaluation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">評価データがありません</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
