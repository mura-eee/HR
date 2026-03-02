"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewEmployeePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
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
    departmentId: "",
    positionId: "",
    grade: "",
    salaryStep: "",
    baseSalary: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, posRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/positions"),
        ]);
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(
            Array.isArray(deptData) ? deptData : deptData.departments || []
          );
        }
        if (posRes.ok) {
          const posData = await posRes.json();
          setPositions(
            Array.isArray(posData) ? posData : posData.positions || []
          );
        }
      } catch (err) {
        console.error("マスタデータ取得エラー:", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "登録に失敗しました");
      }

      const employee = await res.json();
      router.push(`/employees/${employee.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">社員新規登録</h1>
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
            </CardContent>
          </Card>

          {/* Error and Submit */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Link href="/employees">
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
                  登録する
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
