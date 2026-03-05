"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

interface Company {
  id: string;
  name: string;
  code: string;
}

interface JobType {
  id: string;
  name: string;
}

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    employeeCode: "",
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    email: "",
    phone: "",
    hireDate: "",
    birthDate: "",
    gender: "",
    address: "",
    companyId: "",
    departmentId: "",
    positionId: "",
    jobTypeId: "",
    grade: "",
    salaryStep: "",
    baseSalary: "",
    qualificationAllowance: "",
    positionAllowance: "",
    otherAllowance1Name: "",
    otherAllowance1Amount: "",
    otherAllowance2Name: "",
    otherAllowance2Amount: "",
    otherAllowance3Name: "",
    otherAllowance3Amount: "",
    // 社会保険
    healthInsuranceNumber: "",
    healthInsuranceAcquiredDate: "",
    healthInsuranceLostDate: "",
    pensionInsuranceNumber: "",
    pensionAcquiredDate: "",
    pensionLostDate: "",
    basicPensionNumber: "",
    employmentInsuranceAcquiredDate: "",
    employmentInsuranceLostDate: "",
    employmentInsuranceNumber: "",
    // その他
    bloodType: "",
    // 緊急連絡先
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContactAddress: "",
    isActive: true,
  });

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("社員が見つかりません");
        }
        throw new Error("取得に失敗しました");
      }
      const data = await res.json();
      setForm({
        employeeCode: data.employeeCode || "",
        lastName: data.lastName || "",
        firstName: data.firstName || "",
        lastNameKana: data.lastNameKana || "",
        firstNameKana: data.firstNameKana || "",
        email: data.email || "",
        phone: data.phone || "",
        hireDate: formatDateForInput(data.hireDate),
        birthDate: formatDateForInput(data.birthDate),
        gender: data.gender || "",
        address: data.address || "",
        companyId: data.companyId || "",
        departmentId: data.departmentId || "",
        positionId: data.positionId || "",
        jobTypeId: data.jobTypeId || "",
        grade: data.grade !== null && data.grade !== undefined ? String(data.grade) : "",
        salaryStep:
          data.salaryStep !== null && data.salaryStep !== undefined
            ? String(data.salaryStep)
            : "",
        baseSalary:
          data.baseSalary !== null && data.baseSalary !== undefined
            ? String(data.baseSalary)
            : "",
        qualificationAllowance:
          data.qualificationAllowance !== null && data.qualificationAllowance !== undefined
            ? String(data.qualificationAllowance)
            : "",
        positionAllowance:
          data.positionAllowance !== null && data.positionAllowance !== undefined
            ? String(data.positionAllowance)
            : "",
        otherAllowance1Name: data.otherAllowance1Name || "",
        otherAllowance1Amount:
          data.otherAllowance1Amount !== null && data.otherAllowance1Amount !== undefined
            ? String(data.otherAllowance1Amount)
            : "",
        otherAllowance2Name: data.otherAllowance2Name || "",
        otherAllowance2Amount:
          data.otherAllowance2Amount !== null && data.otherAllowance2Amount !== undefined
            ? String(data.otherAllowance2Amount)
            : "",
        otherAllowance3Name: data.otherAllowance3Name || "",
        otherAllowance3Amount:
          data.otherAllowance3Amount !== null && data.otherAllowance3Amount !== undefined
            ? String(data.otherAllowance3Amount)
            : "",
        // 社会保険
        healthInsuranceNumber: data.healthInsuranceNumber || "",
        healthInsuranceAcquiredDate: formatDateForInput(data.healthInsuranceAcquiredDate),
        healthInsuranceLostDate: formatDateForInput(data.healthInsuranceLostDate),
        pensionInsuranceNumber: data.pensionInsuranceNumber || "",
        pensionAcquiredDate: formatDateForInput(data.pensionAcquiredDate),
        pensionLostDate: formatDateForInput(data.pensionLostDate),
        basicPensionNumber: data.basicPensionNumber || "",
        employmentInsuranceAcquiredDate: formatDateForInput(data.employmentInsuranceAcquiredDate),
        employmentInsuranceLostDate: formatDateForInput(data.employmentInsuranceLostDate),
        employmentInsuranceNumber: data.employmentInsuranceNumber || "",
        // その他
        bloodType: data.bloodType || "",
        // 緊急連絡先
        emergencyContactName: data.emergencyContactName || "",
        emergencyContactRelationship: data.emergencyContactRelationship || "",
        emergencyContactPhone: data.emergencyContactPhone || "",
        emergencyContactAddress: data.emergencyContactAddress || "",
        isActive: data.isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }, [id]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [deptRes, posRes, compRes, jtRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/positions"),
        fetch("/api/companies"),
        fetch("/api/job-types"),
      ]);
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(Array.isArray(deptData) ? deptData : deptData.departments || []);
      }
      if (posRes.ok) {
        const posData = await posRes.json();
        setPositions(Array.isArray(posData) ? posData : posData.positions || []);
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.companies || []);
      }
      if (jtRes.ok) {
        const jtData = await jtRes.json();
        setJobTypes(jtData.jobTypes || []);
      }
    } catch (err) {
      console.error("マスタデータ取得エラー:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEmployee(), fetchMasterData()]);
      setLoading(false);
    };
    init();
  }, [fetchEmployee, fetchMasterData]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新に失敗しました");
      }

      router.push(`/employees/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !form.employeeCode) {
    return (
      <div className="space-y-4">
        <Link href="/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/employees/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">社員情報編集</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employeeCode">
                  社員コード <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="employeeCode"
                  value={form.employeeCode}
                  onChange={(e) => handleChange("employeeCode", e.target.value)}
                  placeholder="例: EMP001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  メールアドレス <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="例: taro@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  姓 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="例: 山田"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="例: 太郎"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastNameKana">姓（カナ）</Label>
                <Input
                  id="lastNameKana"
                  value={form.lastNameKana}
                  onChange={(e) => handleChange("lastNameKana", e.target.value)}
                  placeholder="例: ヤマダ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstNameKana">名（カナ）</Label>
                <Input
                  id="firstNameKana"
                  value={form.firstNameKana}
                  onChange={(e) => handleChange("firstNameKana", e.target.value)}
                  placeholder="例: タロウ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="例: 090-1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">性別</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => handleChange("gender", value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="例: 東京都渋谷区..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>日付情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hireDate">入社日</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => handleChange("hireDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">生年月日</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle>所属・給与情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyId">所属</Label>
                <Select
                  value={form.companyId}
                  onValueChange={(value) => handleChange("companyId", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="companyId">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未設定</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTypeId">職種</Label>
                <Select
                  value={form.jobTypeId}
                  onValueChange={(value) => handleChange("jobTypeId", value === "none" ? "" : value)}
                >
                  <SelectTrigger id="jobTypeId">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未設定</SelectItem>
                    {jobTypes.map((jt) => (
                      <SelectItem key={jt.id} value={jt.id}>
                        {jt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="departmentId">部署</Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(value) => handleChange("departmentId", value)}
                >
                  <SelectTrigger id="departmentId">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="positionId">役職</Label>
                <Select
                  value={form.positionId}
                  onValueChange={(value) => handleChange("positionId", value)}
                >
                  <SelectTrigger id="positionId">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">等級</Label>
                <Input
                  id="grade"
                  type="number"
                  min="1"
                  value={form.grade}
                  onChange={(e) => handleChange("grade", e.target.value)}
                  placeholder="例: 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryStep">号俸</Label>
                <Input
                  id="salaryStep"
                  type="number"
                  min="1"
                  value={form.salaryStep}
                  onChange={(e) => handleChange("salaryStep", e.target.value)}
                  placeholder="例: 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseSalary">基本給</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  min="0"
                  value={form.baseSalary}
                  onChange={(e) => handleChange("baseSalary", e.target.value)}
                  placeholder="例: 300000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualificationAllowance">資格手当</Label>
                <Input
                  id="qualificationAllowance"
                  type="number"
                  min="0"
                  value={form.qualificationAllowance}
                  onChange={(e) => handleChange("qualificationAllowance", e.target.value)}
                  placeholder="例: 10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="positionAllowance">役職手当</Label>
                <Input
                  id="positionAllowance"
                  type="number"
                  min="0"
                  value={form.positionAllowance}
                  onChange={(e) => handleChange("positionAllowance", e.target.value)}
                  placeholder="例: 20000"
                />
              </div>
              {/* その他手当1 */}
              <div className="space-y-2">
                <Label htmlFor="otherAllowance1Name">その他手当①（名称）</Label>
                <Input
                  id="otherAllowance1Name"
                  value={form.otherAllowance1Name}
                  onChange={(e) => handleChange("otherAllowance1Name", e.target.value)}
                  placeholder="例: 通勤手当"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherAllowance1Amount">その他手当①（金額）</Label>
                <Input
                  id="otherAllowance1Amount"
                  type="number"
                  min="0"
                  value={form.otherAllowance1Amount}
                  onChange={(e) => handleChange("otherAllowance1Amount", e.target.value)}
                  placeholder="例: 15000"
                />
              </div>
              {/* その他手当2 */}
              <div className="space-y-2">
                <Label htmlFor="otherAllowance2Name">その他手当②（名称）</Label>
                <Input
                  id="otherAllowance2Name"
                  value={form.otherAllowance2Name}
                  onChange={(e) => handleChange("otherAllowance2Name", e.target.value)}
                  placeholder="例: 住宅手当"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherAllowance2Amount">その他手当②（金額）</Label>
                <Input
                  id="otherAllowance2Amount"
                  type="number"
                  min="0"
                  value={form.otherAllowance2Amount}
                  onChange={(e) => handleChange("otherAllowance2Amount", e.target.value)}
                  placeholder="例: 20000"
                />
              </div>
              {/* その他手当3 */}
              <div className="space-y-2">
                <Label htmlFor="otherAllowance3Name">その他手当③（名称）</Label>
                <Input
                  id="otherAllowance3Name"
                  value={form.otherAllowance3Name}
                  onChange={(e) => handleChange("otherAllowance3Name", e.target.value)}
                  placeholder="例: 家族手当"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherAllowance3Amount">その他手当③（金額）</Label>
                <Input
                  id="otherAllowance3Amount"
                  type="number"
                  min="0"
                  value={form.otherAllowance3Amount}
                  onChange={(e) => handleChange("otherAllowance3Amount", e.target.value)}
                  placeholder="例: 10000"
                />
              </div>
              {/* 合計給与（自動計算） */}
              <div className="space-y-2 sm:col-span-2">
                <Label>合計給与</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted font-semibold text-lg">
                  ¥{(
                    (parseInt(form.baseSalary || "0", 10) || 0) +
                    (parseInt(form.qualificationAllowance || "0", 10) || 0) +
                    (parseInt(form.positionAllowance || "0", 10) || 0) +
                    (parseInt(form.otherAllowance1Amount || "0", 10) || 0) +
                    (parseInt(form.otherAllowance2Amount || "0", 10) || 0) +
                    (parseInt(form.otherAllowance3Amount || "0", 10) || 0)
                  ).toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">ステータス</Label>
                <Select
                  value={form.isActive ? "true" : "false"}
                  onValueChange={(value) =>
                    handleChange("isActive", value === "true")
                  }
                >
                  <SelectTrigger id="isActive">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">在籍</SelectItem>
                    <SelectItem value="false">退職</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 社会保険情報 */}
          <Card>
            <CardHeader>
              <CardTitle>社会保険情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* 健康保険 */}
              <div className="space-y-2">
                <Label htmlFor="healthInsuranceNumber">健康保険番号</Label>
                <Input
                  id="healthInsuranceNumber"
                  value={form.healthInsuranceNumber}
                  onChange={(e) => handleChange("healthInsuranceNumber", e.target.value)}
                  placeholder="例: 12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basicPensionNumber">基礎年金番号</Label>
                <Input
                  id="basicPensionNumber"
                  value={form.basicPensionNumber}
                  onChange={(e) => handleChange("basicPensionNumber", e.target.value)}
                  placeholder="例: 1234-567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="healthInsuranceAcquiredDate">健康保険資格取得日</Label>
                <Input
                  id="healthInsuranceAcquiredDate"
                  type="date"
                  value={form.healthInsuranceAcquiredDate}
                  onChange={(e) => handleChange("healthInsuranceAcquiredDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="healthInsuranceLostDate">健康保険資格喪失日</Label>
                <Input
                  id="healthInsuranceLostDate"
                  type="date"
                  value={form.healthInsuranceLostDate}
                  onChange={(e) => handleChange("healthInsuranceLostDate", e.target.value)}
                />
              </div>
              {/* 厚生年金 */}
              <div className="space-y-2">
                <Label htmlFor="pensionInsuranceNumber">厚生年金保険番号</Label>
                <Input
                  id="pensionInsuranceNumber"
                  value={form.pensionInsuranceNumber}
                  onChange={(e) => handleChange("pensionInsuranceNumber", e.target.value)}
                  placeholder="例: 12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentInsuranceNumber">雇用保険被保険者番号</Label>
                <Input
                  id="employmentInsuranceNumber"
                  value={form.employmentInsuranceNumber}
                  onChange={(e) => handleChange("employmentInsuranceNumber", e.target.value)}
                  placeholder="例: 1234-567890-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pensionAcquiredDate">厚生年金資格取得日</Label>
                <Input
                  id="pensionAcquiredDate"
                  type="date"
                  value={form.pensionAcquiredDate}
                  onChange={(e) => handleChange("pensionAcquiredDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pensionLostDate">厚生年金資格喪失日</Label>
                <Input
                  id="pensionLostDate"
                  type="date"
                  value={form.pensionLostDate}
                  onChange={(e) => handleChange("pensionLostDate", e.target.value)}
                />
              </div>
              {/* 雇用保険 */}
              <div className="space-y-2">
                <Label htmlFor="employmentInsuranceAcquiredDate">雇用保険資格取得日</Label>
                <Input
                  id="employmentInsuranceAcquiredDate"
                  type="date"
                  value={form.employmentInsuranceAcquiredDate}
                  onChange={(e) => handleChange("employmentInsuranceAcquiredDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentInsuranceLostDate">雇用保険資格喪失日</Label>
                <Input
                  id="employmentInsuranceLostDate"
                  type="date"
                  value={form.employmentInsuranceLostDate}
                  onChange={(e) => handleChange("employmentInsuranceLostDate", e.target.value)}
                />
              </div>
              {/* 血液型 */}
              <div className="space-y-2">
                <Label htmlFor="bloodType">血液型</Label>
                <Select
                  value={form.bloodType}
                  onValueChange={(value) => handleChange("bloodType", value)}
                >
                  <SelectTrigger id="bloodType">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A型</SelectItem>
                    <SelectItem value="B">B型</SelectItem>
                    <SelectItem value="O">O型</SelectItem>
                    <SelectItem value="AB">AB型</SelectItem>
                    <SelectItem value="unknown">不明</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 緊急連絡先 */}
          <Card>
            <CardHeader>
              <CardTitle>緊急連絡先</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">氏名</Label>
                <Input
                  id="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                  placeholder="例: 山田 花子"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">続柄</Label>
                <Input
                  id="emergencyContactRelationship"
                  value={form.emergencyContactRelationship}
                  onChange={(e) => handleChange("emergencyContactRelationship", e.target.value)}
                  placeholder="例: 配偶者"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">電話番号</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                  placeholder="例: 090-1234-5678"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="emergencyContactAddress">住所</Label>
                <Input
                  id="emergencyContactAddress"
                  value={form.emergencyContactAddress}
                  onChange={(e) => handleChange("emergencyContactAddress", e.target.value)}
                  placeholder="例: 東京都渋谷区..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Error and Submit */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Link href={`/employees/${id}`}>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  更新する
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
