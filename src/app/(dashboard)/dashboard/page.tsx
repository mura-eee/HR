"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  ClipboardCheck,
  Award,
  TrendingUp,
  Clock,
} from "lucide-react";

interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  activeEvaluations: number;
  totalQualifications: number;
  departmentBreakdown: { name: string; count: number }[];
  recentEvaluations: {
    id: string;
    employeeName: string;
    status: string;
    periodName: string;
  }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">
          ようこそ、{session?.user?.name}さん
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">社員数</p>
                <p className="text-3xl font-bold">{stats?.totalEmployees ?? 0}</p>
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
                <p className="text-3xl font-bold">{stats?.totalDepartments ?? 0}</p>
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
                <p className="text-3xl font-bold">{stats?.activeEvaluations ?? 0}</p>
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
                <p className="text-3xl font-bold">{stats?.totalQualifications ?? 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              部署別人数
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.departmentBreakdown && stats.departmentBreakdown.length > 0 ? (
              <div className="space-y-3">
                {stats.departmentBreakdown.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <span className="text-sm">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (dept.count / (stats.totalEmployees || 1)) * 100,
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

        {/* Recent evaluations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5" />
              最近の評価
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentEvaluations && stats.recentEvaluations.length > 0 ? (
              <div className="space-y-3">
                {stats.recentEvaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {evaluation.employeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {evaluation.periodName}
                      </p>
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
