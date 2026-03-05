"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  qualification: Qualification;
}

interface Evaluation {
  id: string;
  evaluationDate: string | null;
  evaluationPeriod: string | null;
  overallRating: string | null;
  score: number | null;
  evaluatorName: string | null;
  comments: string | null;
}

interface Employee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  email: string;
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
  company: { id: string; name: string } | null;
  department: Department | null;
  position: Position | null;
  jobType: { id: string; name: string } | null;
  employeeQualifications: EmployeeQualification[];
  evaluations: Evaluation[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/employees">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {employee.lastName} {employee.firstName}
              </h1>
              <Badge variant={employee.isActive ? "default" : "secondary"}>
                {employee.isActive ? "在籍" : "退職"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              社員コード: {employee.employeeCode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/employees/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
          {employee.isActive && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              無効化
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">
            <User className="mr-2 h-4 w-4" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="qualifications">
            <Award className="mr-2 h-4 w-4" />
            資格
          </TabsTrigger>
          <TabsTrigger value="evaluations">
            <ClipboardList className="mr-2 h-4 w-4" />
            評価履歴
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  個人情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">氏名</p>
                    <p className="font-medium">
                      {employee.lastName} {employee.firstName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      氏名（カナ）
                    </p>
                    <p className="font-medium">
                      {employee.lastNameKana && employee.firstNameKana
                        ? `${employee.lastNameKana} ${employee.firstNameKana}`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">性別</p>
                    <p className="font-medium">
                      {getGenderLabel(employee.gender)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">生年月日</p>
                    <p className="font-medium">
                      {formatDate(employee.birthDate)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    メールアドレス
                  </p>
                  <p className="font-medium">{employee.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    電話番号
                  </p>
                  <p className="font-medium">{employee.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    住所
                  </p>
                  <p className="font-medium">{employee.address || "-"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  所属・給与情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    入社日
                  </p>
                  <p className="font-medium">{formatDate(employee.hireDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    所属
                  </p>
                  <p className="font-medium">{employee.company?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    部署
                  </p>
                  <p className="font-medium">{employee.department?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    役職
                  </p>
                  <p className="font-medium">{employee.position?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    職種
                  </p>
                  <p className="font-medium">{employee.jobType?.name || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">等級</p>
                    <p className="font-medium">
                      {employee.grade !== null
                        ? `${employee.grade}等級`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">号俸</p>
                    <p className="font-medium">
                      {employee.salaryStep !== null
                        ? `${employee.salaryStep}号`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">基本給</p>
                  <p className="font-medium">{formatCurrency(employee.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">資格手当</p>
                  <p className="font-medium">{formatCurrency(employee.qualificationAllowance)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">役職手当</p>
                  <p className="font-medium">{formatCurrency(employee.positionAllowance)}</p>
                </div>
                {employee.otherAllowance1Name && (
                  <div>
                    <p className="text-sm text-muted-foreground">{employee.otherAllowance1Name}</p>
                    <p className="font-medium">{formatCurrency(employee.otherAllowance1Amount)}</p>
                  </div>
                )}
                {employee.otherAllowance2Name && (
                  <div>
                    <p className="text-sm text-muted-foreground">{employee.otherAllowance2Name}</p>
                    <p className="font-medium">{formatCurrency(employee.otherAllowance2Amount)}</p>
                  </div>
                )}
                {employee.otherAllowance3Name && (
                  <div>
                    <p className="text-sm text-muted-foreground">{employee.otherAllowance3Name}</p>
                    <p className="font-medium">{formatCurrency(employee.otherAllowance3Amount)}</p>
                  </div>
                )}
                <div className="border-t pt-2">
                  <p className="text-sm text-muted-foreground">合計給与</p>
                  <p className="font-bold text-lg">
                    {formatCurrency(
                      (employee.baseSalary || 0) +
                      (employee.qualificationAllowance || 0) +
                      (employee.positionAllowance || 0) +
                      (employee.otherAllowance1Amount || 0) +
                      (employee.otherAllowance2Amount || 0) +
                      (employee.otherAllowance3Amount || 0)
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 社会保険情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                社会保険情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">健康保険番号</p>
                  <p className="font-medium">{employee.healthInsuranceNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">健康保険資格取得日</p>
                  <p className="font-medium">{formatDate(employee.healthInsuranceAcquiredDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">健康保険資格喪失日</p>
                  <p className="font-medium">{formatDate(employee.healthInsuranceLostDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">厚生年金保険番号</p>
                  <p className="font-medium">{employee.pensionInsuranceNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">厚生年金資格取得日</p>
                  <p className="font-medium">{formatDate(employee.pensionAcquiredDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">厚生年金資格喪失日</p>
                  <p className="font-medium">{formatDate(employee.pensionLostDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">基礎年金番号</p>
                  <p className="font-medium">{employee.basicPensionNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">雇用保険資格取得日</p>
                  <p className="font-medium">{formatDate(employee.employmentInsuranceAcquiredDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">雇用保険資格喪失日</p>
                  <p className="font-medium">{formatDate(employee.employmentInsuranceLostDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">雇用保険被保険者番号</p>
                  <p className="font-medium">{employee.employmentInsuranceNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">血液型</p>
                  <p className="font-medium">
                    {employee.bloodType
                      ? employee.bloodType === "unknown"
                        ? "不明"
                        : `${employee.bloodType}型`
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 緊急連絡先 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5" />
                緊急連絡先
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">氏名</p>
                  <p className="font-medium">{employee.emergencyContactName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">続柄</p>
                  <p className="font-medium">{employee.emergencyContactRelationship || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">電話番号</p>
                  <p className="font-medium">{employee.emergencyContactPhone || "-"}</p>
                </div>
                <div className="sm:col-span-2 md:col-span-4">
                  <p className="text-sm text-muted-foreground">住所</p>
                  <p className="font-medium">{employee.emergencyContactAddress || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                保有資格一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.employeeQualifications &&
              employee.employeeQualifications.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>資格名</TableHead>
                        <TableHead>カテゴリ</TableHead>
                        <TableHead>取得日</TableHead>
                        <TableHead>有効期限</TableHead>
                        <TableHead>ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.employeeQualifications.map((eq) => {
                        const isExpired =
                          eq.expiryDate &&
                          new Date(eq.expiryDate) < new Date();
                        return (
                          <TableRow key={eq.id}>
                            <TableCell className="font-medium">
                              {eq.qualification.name}
                            </TableCell>
                            <TableCell>
                              {eq.qualification.category || "-"}
                            </TableCell>
                            <TableCell>
                              {formatDate(eq.acquiredDate)}
                            </TableCell>
                            <TableCell>
                              {formatDate(eq.expiryDate)}
                            </TableCell>
                            <TableCell>
                              {eq.expiryDate ? (
                                <Badge
                                  variant={isExpired ? "destructive" : "default"}
                                >
                                  {isExpired ? "期限切れ" : "有効"}
                                </Badge>
                              ) : (
                                <Badge variant="outline">無期限</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  登録されている資格はありません
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                評価履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employee.evaluations && employee.evaluations.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>評価日</TableHead>
                        <TableHead>評価期間</TableHead>
                        <TableHead>総合評価</TableHead>
                        <TableHead>スコア</TableHead>
                        <TableHead>評価者</TableHead>
                        <TableHead>コメント</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.evaluations.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell>
                            {formatDate(ev.evaluationDate)}
                          </TableCell>
                          <TableCell>
                            {ev.evaluationPeriod || "-"}
                          </TableCell>
                          <TableCell>
                            {ev.overallRating ? (
                              <Badge variant="outline">
                                {ev.overallRating}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {ev.score !== null ? ev.score : "-"}
                          </TableCell>
                          <TableCell>
                            {ev.evaluatorName || "-"}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {ev.comments || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  評価履歴はありません
                </p>
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
