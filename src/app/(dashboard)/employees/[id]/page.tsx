"use client";

import { useEffect, useState, useCallback } from "react";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  Award,
  ClipboardList,
  Loader2,
  Shield,
  Heart,
  History,
  ExternalLink,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Department {
  id: string;
  name: string;
  code: string;
  parentDepartment: { id: string; name: string } | null;
}

interface Position {
  id: string;
  name: string;
  level: number;
}

interface Qualification {
  id: string;
  name: string;
  category: string | null;
}

interface EmployeeQualification {
  id: string;
  acquiredDate: string | null;
  expiryDate: string | null;
  certificateUrl: string | null;
  qualification: Qualification;
}

interface NameHistory {
  id: string;
  lastName: string;
  firstName: string;
  changedAt: string;
  reason: string | null;
}

interface EvaluationListItem {
  id: string;
  status: string;
  totalScore: number | null;
  rank: string | null;
  updatedAt: string;
  period: { id: string; name: string; year: number; half: string };
  firstEvaluator: { id: string; lastName: string; firstName: string } | null;
  secondEvaluator: { id: string; lastName: string; firstName: string } | null;
}

interface Employee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  email: string | null;
  phone: string | null;
  hireDate: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  grade: number | null;
  salaryStep: number | null;
  baseSalary: number | null;
  qualificationAllowance: number | null;
  positionAllowance: number | null;
  otherAllowance1Name: string | null;
  otherAllowance1Amount: number | null;
  otherAllowance2Name: string | null;
  otherAllowance2Amount: number | null;
  otherAllowance3Name: string | null;
  otherAllowance3Amount: number | null;
  // 社会保険
  healthInsuranceNumber: string | null;
  healthInsuranceAcquiredDate: string | null;
  healthInsuranceLostDate: string | null;
  pensionInsuranceNumber: string | null;
  pensionAcquiredDate: string | null;
  pensionLostDate: string | null;
  basicPensionNumber: string | null;
  employmentInsuranceAcquiredDate: string | null;
  employmentInsuranceLostDate: string | null;
  employmentInsuranceNumber: string | null;
  // その他
  bloodType: string | null;
  // 緊急連絡先
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  profileImage: string | null;
  isActive: boolean;
  workRole: string | null;
  company: { id: string; name: string } | null;
  department: Department | null;
  position: Position | null;
  jobType: { id: string; name: string } | null;
  qualifications: EmployeeQualification[];
  nameHistories: NameHistory[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "-";
  return `¥${amount.toLocaleString()}`;
}

function getGenderLabel(gender: string | null): string {
  switch (gender) {
    case "male":
      return "男性";
    case "female":
      return "女性";
    case "other":
      return "その他";
    default:
      return "-";
  }
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const { can } = useFieldPermissions(employee?.company?.id ?? null, employee?.department?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([]);
  const [evaluationsLoaded, setEvaluationsLoaded] = useState(false);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("社員が見つかりません");
        }
        throw new Error("取得に失敗しました");
      }
      const data = await res.json();
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleTabChange = useCallback(async (value: string) => {
    if (value === "evaluations" && !evaluationsLoaded) {
      setEvaluationsLoading(true);
      try {
        const res = await fetch(`/api/evaluations?employeeId=${id}`);
        if (res.ok) {
          const data = await res.json();
          setEvaluations(data);
        }
      } finally {
        setEvaluationsLoaded(true);
        setEvaluationsLoading(false);
      }
    }
  }, [id, evaluationsLoaded]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "無効化に失敗しました");
      }
      router.push("/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無効化に失敗しました");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-4">
        <Link href="/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {error || "社員情報を取得できません"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link href="/employees">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          スタッフ一覧に戻る
        </Button>
      </Link>

      {/* Profile Hero Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="w-20 h-20 border-2 border-white shadow-md">
              <AvatarImage src={employee.profileImage ?? undefined} />
              <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-700">
                {employee.lastName?.[0]}{employee.firstName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">
                  {employee.lastName} {employee.firstName}
                </h1>
                <Badge variant={employee.isActive ? "default" : "secondary"} className="text-xs">
                  {employee.isActive ? "在籍" : "退職"}
                </Badge>
              </div>
              {(employee.lastNameKana || employee.firstNameKana) && (
                <p className="text-sm text-muted-foreground mb-2">
                  {employee.lastNameKana} {employee.firstNameKana}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-3">社員コード: {employee.employeeCode}</p>
              <div className="flex flex-wrap gap-2">
                {employee.company && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border rounded-full px-3 py-1 font-medium">
                    <Building2 className="h-3 w-3 text-blue-500" />
                    {employee.company.name}
                  </span>
                )}
                {employee.department && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border rounded-full px-3 py-1 font-medium">
                    <Building2 className="h-3 w-3 text-indigo-500" />
                    {employee.department.parentDepartment
                      ? `${employee.department.parentDepartment.name} / ${employee.department.name}`
                      : employee.department.name}
                  </span>
                )}
                {employee.position && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border rounded-full px-3 py-1 font-medium">
                    <Briefcase className="h-3 w-3 text-violet-500" />
                    {employee.position.name}
                  </span>
                )}
                {employee.workRole && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border rounded-full px-3 py-1 font-medium">
                    <Briefcase className="h-3 w-3 text-purple-400" />
                    {employee.workRole}
                  </span>
                )}
                {employee.grade !== null && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border rounded-full px-3 py-1 font-medium">
                    {employee.grade}等級
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 self-start sm:self-center">
              <Link href={`/employees/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </Button>
              </Link>
              {employee.isActive && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  無効化
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="basic" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="basic" className="text-xs sm:text-sm">
            <User className="mr-1.5 h-3.5 w-3.5" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="salary" className="text-xs sm:text-sm">
            <Banknote className="mr-1.5 h-3.5 w-3.5" />
            給与・等級
          </TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs sm:text-sm">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            社会保険
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="text-xs sm:text-sm">
            <Award className="mr-1.5 h-3.5 w-3.5" />
            資格・スキル
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="text-xs sm:text-sm">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            評価履歴
          </TabsTrigger>
          <TabsTrigger value="emergency" className="text-xs sm:text-sm">
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            緊急連絡先
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  個人情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(can("name") !== "hidden" || can("nameKana") !== "hidden") && (
                  <div className="grid grid-cols-2 gap-4">
                    {can("name") !== "hidden" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">氏名</p>
                        <p className="font-medium">{employee.lastName} {employee.firstName}</p>
                      </div>
                    )}
                    {can("nameKana") !== "hidden" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">氏名（カナ）</p>
                        <p className="font-medium text-sm">
                          {employee.lastNameKana && employee.firstNameKana
                            ? `${employee.lastNameKana} ${employee.firstNameKana}`
                            : "-"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {can("name") !== "hidden" && employee.nameHistories && employee.nameHistories.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <History className="h-3 w-3" />氏名変更履歴
                    </p>
                    <div className="space-y-1">
                      {employee.nameHistories.map((h) => (
                        <div key={h.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{h.lastName} {h.firstName}</span>
                          <span>→</span>
                          <span>{formatDate(h.changedAt)}</span>
                          {h.reason && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{h.reason}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(can("gender") !== "hidden" || can("birthDate") !== "hidden") && (
                  <div className="grid grid-cols-2 gap-4">
                    {can("gender") !== "hidden" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">性別</p>
                        <p className="font-medium">{getGenderLabel(employee.gender)}</p>
                      </div>
                    )}
                    {can("birthDate") !== "hidden" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">生年月日</p>
                        <p className="font-medium">{formatDate(employee.birthDate)}</p>
                      </div>
                    )}
                  </div>
                )}
                {can("bloodType") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">血液型</p>
                    <p className="font-medium">
                      {employee.bloodType ? (employee.bloodType === "unknown" ? "不明" : `${employee.bloodType}型`) : "-"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4" />
                  連絡先
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {can("email") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5"><Mail className="h-3 w-3" />メールアドレス</p>
                    <p className="font-medium">{employee.email || "-"}</p>
                  </div>
                )}
                {can("phone") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5"><Phone className="h-3 w-3" />電話番号</p>
                    <p className="font-medium">{employee.phone || "-"}</p>
                  </div>
                )}
                {can("address") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5"><MapPin className="h-3 w-3" />住所</p>
                    <p className="font-medium">{employee.address || "-"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 所属情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                所属情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                {can("hireDate") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />入社日</p>
                    <p className="font-medium">{formatDate(employee.hireDate)}</p>
                  </div>
                )}
                {can("company") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">所属会社</p>
                    <p className="font-medium">{employee.company?.name || "-"}</p>
                  </div>
                )}
                {can("department") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">部署</p>
                    <p className="font-medium text-sm">
                      {employee.department?.parentDepartment
                        ? `${employee.department.parentDepartment.name} / ${employee.department.name}`
                        : employee.department?.name || "-"}
                    </p>
                  </div>
                )}
                {can("position") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Briefcase className="h-3 w-3" />役職</p>
                    <p className="font-medium">{employee.position?.name || "-"}</p>
                  </div>
                )}
                {employee.workRole && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">役割</p>
                    <p className="font-medium">{employee.workRole}</p>
                  </div>
                )}
                {can("jobType") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">職種</p>
                    <p className="font-medium">{employee.jobType?.name || "-"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Tab */}
        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4" />
                等級・号俸
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                {can("grade") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">等級</p>
                    <p className="font-medium text-lg">{employee.grade !== null ? `${employee.grade}等級` : "-"}</p>
                  </div>
                )}
                {can("salaryStep") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">号俸</p>
                    <p className="font-medium text-lg">{employee.salaryStep !== null ? `${employee.salaryStep}号` : "-"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4" />
                給与明細
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                {can("baseSalary") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">基本給</p>
                    <p className="font-medium">{formatCurrency(employee.baseSalary)}</p>
                  </div>
                )}
                {can("qualificationAllowance") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">資格手当</p>
                    <p className="font-medium">{formatCurrency(employee.qualificationAllowance)}</p>
                  </div>
                )}
                {can("positionAllowance") !== "hidden" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">役職手当</p>
                    <p className="font-medium">{formatCurrency(employee.positionAllowance)}</p>
                  </div>
                )}
                {can("otherAllowance1") !== "hidden" && employee.otherAllowance1Name && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{employee.otherAllowance1Name}</p>
                    <p className="font-medium">{formatCurrency(employee.otherAllowance1Amount)}</p>
                  </div>
                )}
                {can("otherAllowance2") !== "hidden" && employee.otherAllowance2Name && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{employee.otherAllowance2Name}</p>
                    <p className="font-medium">{formatCurrency(employee.otherAllowance2Amount)}</p>
                  </div>
                )}
                {can("otherAllowance3") !== "hidden" && employee.otherAllowance3Name && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{employee.otherAllowance3Name}</p>
                    <p className="font-medium">{formatCurrency(employee.otherAllowance3Amount)}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">合計給与</p>
                <p className="font-bold text-xl text-blue-700">
                  {formatCurrency(
                    (can("baseSalary") !== "hidden" ? (employee.baseSalary || 0) : 0) +
                    (can("qualificationAllowance") !== "hidden" ? (employee.qualificationAllowance || 0) : 0) +
                    (can("positionAllowance") !== "hidden" ? (employee.positionAllowance || 0) : 0) +
                    (can("otherAllowance1") !== "hidden" ? (employee.otherAllowance1Amount || 0) : 0) +
                    (can("otherAllowance2") !== "hidden" ? (employee.otherAllowance2Amount || 0) : 0) +
                    (can("otherAllowance3") !== "hidden" ? (employee.otherAllowance3Amount || 0) : 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance">
          {(can("healthInsurance") !== "hidden" || can("pension") !== "hidden" || can("basicPensionNumber") !== "hidden" || can("employmentInsurance") !== "hidden" || can("bloodType") !== "hidden") ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  社会保険情報
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  {can("healthInsurance") !== "hidden" && <>
                    <div><p className="text-xs text-muted-foreground mb-0.5">健康保険番号</p><p className="font-medium">{employee.healthInsuranceNumber || "-"}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">健康保険資格取得日</p><p className="font-medium">{formatDate(employee.healthInsuranceAcquiredDate)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">健康保険資格喪失日</p><p className="font-medium">{formatDate(employee.healthInsuranceLostDate)}</p></div>
                  </>}
                  {can("pension") !== "hidden" && <>
                    <div><p className="text-xs text-muted-foreground mb-0.5">厚生年金保険番号</p><p className="font-medium">{employee.pensionInsuranceNumber || "-"}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">厚生年金資格取得日</p><p className="font-medium">{formatDate(employee.pensionAcquiredDate)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">厚生年金資格喪失日</p><p className="font-medium">{formatDate(employee.pensionLostDate)}</p></div>
                  </>}
                  {can("basicPensionNumber") !== "hidden" && (
                    <div><p className="text-xs text-muted-foreground mb-0.5">基礎年金番号</p><p className="font-medium">{employee.basicPensionNumber || "-"}</p></div>
                  )}
                  {can("employmentInsurance") !== "hidden" && <>
                    <div><p className="text-xs text-muted-foreground mb-0.5">雇用保険資格取得日</p><p className="font-medium">{formatDate(employee.employmentInsuranceAcquiredDate)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">雇用保険資格喪失日</p><p className="font-medium">{formatDate(employee.employmentInsuranceLostDate)}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-0.5">雇用保険被保険者番号</p><p className="font-medium">{employee.employmentInsuranceNumber || "-"}</p></div>
                  </>}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-center py-8">表示権限がありません</p>
          )}
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4" />
                保有資格一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.qualifications && employee.qualifications.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>資格名</TableHead>
                        <TableHead>カテゴリ</TableHead>
                        <TableHead>取得日</TableHead>
                        <TableHead>有効期限</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>資格証</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.qualifications.map((eq) => {
                        const isExpired = eq.expiryDate && new Date(eq.expiryDate) < new Date();
                        return (
                          <TableRow key={eq.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/qualifications?tab=employee&qualificationId=${eq.qualification.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {eq.qualification.name}
                              </Link>
                            </TableCell>
                            <TableCell>{eq.qualification.category || "-"}</TableCell>
                            <TableCell>{formatDate(eq.acquiredDate)}</TableCell>
                            <TableCell>{formatDate(eq.expiryDate)}</TableCell>
                            <TableCell>
                              {eq.expiryDate ? (
                                <Badge variant={isExpired ? "destructive" : "default"}>
                                  {isExpired ? "期限切れ" : "有効"}
                                </Badge>
                              ) : (
                                <Badge variant="outline">無期限</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {eq.certificateUrl ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => window.open(eq.certificateUrl!, "_blank")}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  証を見る
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">登録されている資格はありません</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                評価履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evaluationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : evaluations.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>評価期間</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>総合スコア</TableHead>
                        <TableHead>ランク</TableHead>
                        <TableHead>一次評価者</TableHead>
                        <TableHead>二次評価者</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluations.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell>{ev.period?.name ?? "-"}</TableCell>
                          <TableCell><Badge variant="outline">{ev.status}</Badge></TableCell>
                          <TableCell>{ev.totalScore !== null ? ev.totalScore : "-"}</TableCell>
                          <TableCell>{ev.rank ?? "-"}</TableCell>
                          <TableCell>
                            {ev.firstEvaluator ? `${ev.firstEvaluator.lastName} ${ev.firstEvaluator.firstName}` : "-"}
                          </TableCell>
                          <TableCell>
                            {ev.secondEvaluator ? `${ev.secondEvaluator.lastName} ${ev.secondEvaluator.firstName}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">評価履歴はありません</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4" />
                緊急連絡先
              </CardTitle>
            </CardHeader>
            <CardContent>
              {can("emergencyContact") !== "hidden" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                  <div><p className="text-xs text-muted-foreground mb-0.5">氏名</p><p className="font-medium">{employee.emergencyContactName || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">続柄</p><p className="font-medium">{employee.emergencyContactRelationship || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-0.5">電話番号</p><p className="font-medium">{employee.emergencyContactPhone || "-"}</p></div>
                  <div className="sm:col-span-2 md:col-span-4"><p className="text-xs text-muted-foreground mb-0.5">住所</p><p className="font-medium">{employee.emergencyContactAddress || "-"}</p></div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">表示権限がありません</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>社員の無効化</DialogTitle>
            <DialogDescription>
              {employee.lastName} {employee.firstName}（{employee.employeeCode}
              ）を無効化しますか？この操作により、社員のステータスが「退職」に変更されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                "無効化する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
