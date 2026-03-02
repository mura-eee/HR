"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Briefcase,
  Calendar,
  BarChart3,
} from "lucide-react";

// ===== Types =====

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  employeeId: string | null;
  employee?: {
    lastName: string;
    firstName: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  parentDepartment?: { id: string; name: string } | null;
  _count?: { employees: number; childDepartments: number };
}

interface Position {
  id: string;
  name: string;
  level: number;
  sortOrder: number;
  _count?: { employees: number };
}

interface EvaluationPeriod {
  id: string;
  name: string;
  assessmentStartDate: string;
  assessmentEndDate: string;
  evaluationStartDate: string;
  evaluationEndDate: string;
  half: string;
  year: number;
  isActive: boolean;
}

interface CompetencyItem {
  id: string;
  category: string;
  name: string;
  description: string | null;
  coefficient: number;
  level1Text: string | null;
  level2Text: string | null;
  level3Text: string | null;
  level4Text: string | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  sortOrder: number;
  isActive: boolean;
}

// ===== Helpers =====

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

const roleLabels: Record<string, string> = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  GENERAL: "一般",
};

// ===== Main Component =====

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");

  // Check admin role
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // ---------- Users ----------
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchUsersData = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/settings/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchUsersData();
      } else {
        const data = await res.json();
        alert(data.error || "ロールの変更に失敗しました");
      }
    } catch (error) {
      console.error("Failed to change role:", error);
      alert("ロールの変更に失敗しました");
    }
  };

  // ---------- Departments ----------
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    parentDepartmentId: "",
    sortOrder: "0",
  });

  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepts(true);
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  const openDeptDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        name: dept.name,
        code: dept.code,
        parentDepartmentId: dept.parentDepartmentId || "",
        sortOrder: String(dept.sortOrder),
      });
    } else {
      setEditingDept(null);
      setDeptForm({ name: "", code: "", parentDepartmentId: "", sortOrder: "0" });
    }
    setDeptDialogOpen(true);
  };

  const handleSaveDept = async () => {
    try {
      const url = editingDept
        ? `/api/departments/${editingDept.id}`
        : "/api/departments";
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...deptForm,
          parentDepartmentId: deptForm.parentDepartmentId || null,
        }),
      });

      if (res.ok) {
        setDeptDialogOpen(false);
        fetchDepartments();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Failed to save department:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm("この部署を削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDepartments();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete department:", error);
      alert("削除に失敗しました");
    }
  };

  // ---------- Positions ----------
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm, setPosForm] = useState({
    name: "",
    level: "0",
    sortOrder: "0",
  });

  const fetchPositions = useCallback(async () => {
    try {
      setLoadingPositions(true);
      const res = await fetch("/api/positions");
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions);
      }
    } catch (error) {
      console.error("Failed to fetch positions:", error);
    } finally {
      setLoadingPositions(false);
    }
  }, []);

  const openPosDialog = (pos?: Position) => {
    if (pos) {
      setEditingPos(pos);
      setPosForm({
        name: pos.name,
        level: String(pos.level),
        sortOrder: String(pos.sortOrder),
      });
    } else {
      setEditingPos(null);
      setPosForm({ name: "", level: "0", sortOrder: "0" });
    }
    setPosDialogOpen(true);
  };

  const handleSavePos = async () => {
    try {
      const url = editingPos
        ? `/api/positions/${editingPos.id}`
        : "/api/positions";
      const method = editingPos ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posForm),
      });

      if (res.ok) {
        setPosDialogOpen(false);
        fetchPositions();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Failed to save position:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeletePos = async (id: string) => {
    if (!confirm("この役職を削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPositions();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete position:", error);
      alert("削除に失敗しました");
    }
  };

  // ---------- Evaluation Periods ----------
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    assessmentStartDate: "",
    assessmentEndDate: "",
    evaluationStartDate: "",
    evaluationEndDate: "",
    half: "FIRST",
    year: String(new Date().getFullYear()),
    isActive: true,
  });

  const fetchPeriods = useCallback(async () => {
    try {
      setLoadingPeriods(true);
      const res = await fetch("/api/settings/evaluation-periods");
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods);
      }
    } catch (error) {
      console.error("Failed to fetch periods:", error);
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  const openPeriodDialog = (period?: EvaluationPeriod) => {
    if (period) {
      setEditingPeriod(period);
      setPeriodForm({
        name: period.name,
        assessmentStartDate: period.assessmentStartDate
          ? new Date(period.assessmentStartDate).toISOString().split("T")[0]
          : "",
        assessmentEndDate: period.assessmentEndDate
          ? new Date(period.assessmentEndDate).toISOString().split("T")[0]
          : "",
        evaluationStartDate: period.evaluationStartDate
          ? new Date(period.evaluationStartDate).toISOString().split("T")[0]
          : "",
        evaluationEndDate: period.evaluationEndDate
          ? new Date(period.evaluationEndDate).toISOString().split("T")[0]
          : "",
        half: period.half,
        year: String(period.year),
        isActive: period.isActive,
      });
    } else {
      setEditingPeriod(null);
      setPeriodForm({
        name: "",
        assessmentStartDate: "",
        assessmentEndDate: "",
        evaluationStartDate: "",
        evaluationEndDate: "",
        half: "FIRST",
        year: String(new Date().getFullYear()),
        isActive: true,
      });
    }
    setPeriodDialogOpen(true);
  };

  const handleSavePeriod = async () => {
    try {
      const url = editingPeriod
        ? `/api/settings/evaluation-periods/${editingPeriod.id}`
        : "/api/settings/evaluation-periods";
      const method = editingPeriod ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(periodForm),
      });

      if (res.ok) {
        setPeriodDialogOpen(false);
        fetchPeriods();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Failed to save period:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("この評価期間を削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`/api/settings/evaluation-periods/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPeriods();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete period:", error);
      alert("削除に失敗しました");
    }
  };

  // ---------- Competency Items ----------
  const [competencyItems, setCompetencyItems] = useState<CompetencyItem[]>([]);
  const [loadingCompetency, setLoadingCompetency] = useState(true);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<CompetencyItem | null>(null);
  const [compForm, setCompForm] = useState({
    category: "",
    name: "",
    description: "",
    coefficient: "2",
    level1Text: "",
    level2Text: "",
    level3Text: "",
    level4Text: "",
    departmentId: "",
    sortOrder: "0",
    isActive: true,
  });

  const fetchCompetencyItems = useCallback(async () => {
    try {
      setLoadingCompetency(true);
      const res = await fetch("/api/settings/competency-items");
      if (res.ok) {
        const data = await res.json();
        setCompetencyItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch competency items:", error);
    } finally {
      setLoadingCompetency(false);
    }
  }, []);

  const openCompDialog = (item?: CompetencyItem) => {
    if (item) {
      setEditingComp(item);
      setCompForm({
        category: item.category,
        name: item.name,
        description: item.description || "",
        coefficient: String(item.coefficient),
        level1Text: item.level1Text || "",
        level2Text: item.level2Text || "",
        level3Text: item.level3Text || "",
        level4Text: item.level4Text || "",
        departmentId: item.departmentId || "",
        sortOrder: String(item.sortOrder),
        isActive: item.isActive,
      });
    } else {
      setEditingComp(null);
      setCompForm({
        category: "",
        name: "",
        description: "",
        coefficient: "2",
        level1Text: "",
        level2Text: "",
        level3Text: "",
        level4Text: "",
        departmentId: "",
        sortOrder: "0",
        isActive: true,
      });
    }
    setCompDialogOpen(true);
  };

  const handleSaveComp = async () => {
    try {
      const url = editingComp
        ? `/api/settings/competency-items/${editingComp.id}`
        : "/api/settings/competency-items";
      const method = editingComp ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...compForm,
          departmentId: compForm.departmentId || null,
        }),
      });

      if (res.ok) {
        setCompDialogOpen(false);
        fetchCompetencyItems();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Failed to save competency item:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeleteComp = async (id: string) => {
    if (!confirm("このコンピテンシー項目を削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`/api/settings/competency-items/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCompetencyItems();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete competency item:", error);
      alert("削除に失敗しました");
    }
  };

  // ---------- Effects ----------

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsersData();
      fetchDepartments();
      fetchPositions();
      fetchPeriods();
      fetchCompetencyItems();
    }
  }, [session, fetchUsersData, fetchDepartments, fetchPositions, fetchPeriods, fetchCompetencyItems]);

  // ---------- Guard ----------

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <div className="h-96 animate-pulse bg-gray-200 rounded" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          このページにアクセスする権限がありません
        </p>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-7 h-7" />
          設定
        </h1>
        <p className="text-muted-foreground">システム管理設定</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="users" className="gap-1">
            <Users className="w-4 h-4" />
            ユーザー管理
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1">
            <Building2 className="w-4 h-4" />
            部署管理
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-1">
            <Briefcase className="w-4 h-4" />
            役職管理
          </TabsTrigger>
          <TabsTrigger value="periods" className="gap-1">
            <Calendar className="w-4 h-4" />
            評価期間
          </TabsTrigger>
          <TabsTrigger value="competency" className="gap-1">
            <BarChart3 className="w-4 h-4" />
            コンピテンシー項目
          </TabsTrigger>
        </TabsList>

        {/* ===== ユーザー管理 Tab ===== */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ユーザー一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  ユーザーが登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>関連社員</TableHead>
                      <TableHead>ロール</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.employee
                            ? `${user.employee.lastName} ${user.employee.firstName}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">管理者</SelectItem>
                              <SelectItem value="MANAGER">マネージャー</SelectItem>
                              <SelectItem value="GENERAL">一般</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 部署管理 Tab ===== */}
        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">部署一覧</CardTitle>
              <Button onClick={() => openDeptDialog()} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                新規追加
              </Button>
            </CardHeader>
            <CardContent>
              {loadingDepts ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : departments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  部署が登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>部署名</TableHead>
                      <TableHead>部署コード</TableHead>
                      <TableHead>親部署</TableHead>
                      <TableHead className="text-center">表示順</TableHead>
                      <TableHead className="text-center">社員数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{dept.code}</Badge>
                        </TableCell>
                        <TableCell>
                          {dept.parentDepartment?.name || "-"}
                        </TableCell>
                        <TableCell className="text-center">{dept.sortOrder}</TableCell>
                        <TableCell className="text-center">
                          {dept._count?.employees ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeptDialog(dept)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDept(dept.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 役職管理 Tab ===== */}
        <TabsContent value="positions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">役職一覧</CardTitle>
              <Button onClick={() => openPosDialog()} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                新規追加
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPositions ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : positions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  役職が登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>役職名</TableHead>
                      <TableHead className="text-center">レベル</TableHead>
                      <TableHead className="text-center">表示順</TableHead>
                      <TableHead className="text-center">社員数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((pos) => (
                      <TableRow key={pos.id}>
                        <TableCell className="font-medium">{pos.name}</TableCell>
                        <TableCell className="text-center">{pos.level}</TableCell>
                        <TableCell className="text-center">{pos.sortOrder}</TableCell>
                        <TableCell className="text-center">
                          {pos._count?.employees ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPosDialog(pos)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePos(pos.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 評価期間 Tab ===== */}
        <TabsContent value="periods">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">評価期間一覧</CardTitle>
              <Button onClick={() => openPeriodDialog()} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                新規追加
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPeriods ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : periods.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  評価期間が登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>年度</TableHead>
                      <TableHead>期</TableHead>
                      <TableHead>評価対象期間</TableHead>
                      <TableHead>評価実施期間</TableHead>
                      <TableHead className="text-center">ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>{period.year}年</TableCell>
                        <TableCell>
                          {period.half === "FIRST" ? "上期" : "下期"}
                        </TableCell>
                        <TableCell>
                          {formatDate(period.assessmentStartDate)} ~{" "}
                          {formatDate(period.assessmentEndDate)}
                        </TableCell>
                        <TableCell>
                          {formatDate(period.evaluationStartDate)} ~{" "}
                          {formatDate(period.evaluationEndDate)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={period.isActive ? "default" : "secondary"}
                          >
                            {period.isActive ? "有効" : "無効"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPeriodDialog(period)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePeriod(period.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== コンピテンシー項目 Tab ===== */}
        <TabsContent value="competency">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">コンピテンシー項目一覧</CardTitle>
              <Button onClick={() => openCompDialog()} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                新規追加
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCompetency ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : competencyItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  コンピテンシー項目が登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>項目名</TableHead>
                      <TableHead>部署</TableHead>
                      <TableHead className="text-center">係数</TableHead>
                      <TableHead className="text-center">表示順</TableHead>
                      <TableHead className="text-center">ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competencyItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="secondary">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.department?.name || "全部署共通"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.coefficient}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.sortOrder}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={item.isActive ? "default" : "secondary"}
                          >
                            {item.isActive ? "有効" : "無効"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCompDialog(item)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteComp(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Department Dialog ===== */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "部署を編集" : "部署を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">部署名 *</Label>
              <Input
                id="dept-name"
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, name: e.target.value })
                }
                placeholder="例: 営業部"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">部署コード *</Label>
              <Input
                id="dept-code"
                value={deptForm.code}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, code: e.target.value })
                }
                placeholder="例: SALES"
              />
            </div>
            <div className="space-y-2">
              <Label>親部署</Label>
              <Select
                value={deptForm.parentDepartmentId}
                onValueChange={(v) =>
                  setDeptForm({
                    ...deptForm,
                    parentDepartmentId: v === "none" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="なし" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {departments
                    .filter((d) => d.id !== editingDept?.id)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-sort">表示順</Label>
              <Input
                id="dept-sort"
                type="number"
                value={deptForm.sortOrder}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, sortOrder: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSaveDept}
              disabled={!deptForm.name || !deptForm.code}
            >
              {editingDept ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Position Dialog ===== */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPos ? "役職を編集" : "役職を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pos-name">役職名 *</Label>
              <Input
                id="pos-name"
                value={posForm.name}
                onChange={(e) =>
                  setPosForm({ ...posForm, name: e.target.value })
                }
                placeholder="例: 部長"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-level">レベル</Label>
              <Input
                id="pos-level"
                type="number"
                value={posForm.level}
                onChange={(e) =>
                  setPosForm({ ...posForm, level: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-sort">表示順</Label>
              <Input
                id="pos-sort"
                type="number"
                value={posForm.sortOrder}
                onChange={(e) =>
                  setPosForm({ ...posForm, sortOrder: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSavePos} disabled={!posForm.name}>
              {editingPos ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Evaluation Period Dialog ===== */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? "評価期間を編集" : "評価期間を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">名称 *</Label>
              <Input
                id="period-name"
                value={periodForm.name}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, name: e.target.value })
                }
                placeholder="例: 2026年度 上期評価"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-year">年度 *</Label>
                <Input
                  id="period-year"
                  type="number"
                  value={periodForm.year}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, year: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>期 *</Label>
                <Select
                  value={periodForm.half}
                  onValueChange={(v) =>
                    setPeriodForm({ ...periodForm, half: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST">上期</SelectItem>
                    <SelectItem value="SECOND">下期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-as">評価対象開始日 *</Label>
                <Input
                  id="period-as"
                  type="date"
                  value={periodForm.assessmentStartDate}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      assessmentStartDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-ae">評価対象終了日 *</Label>
                <Input
                  id="period-ae"
                  type="date"
                  value={periodForm.assessmentEndDate}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      assessmentEndDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-es">評価実施開始日 *</Label>
                <Input
                  id="period-es"
                  type="date"
                  value={periodForm.evaluationStartDate}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      evaluationStartDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-ee">評価実施終了日 *</Label>
                <Input
                  id="period-ee"
                  type="date"
                  value={periodForm.evaluationEndDate}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      evaluationEndDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="period-active"
                checked={periodForm.isActive}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, isActive: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="period-active">有効</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPeriodDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSavePeriod}
              disabled={
                !periodForm.name ||
                !periodForm.assessmentStartDate ||
                !periodForm.assessmentEndDate ||
                !periodForm.evaluationStartDate ||
                !periodForm.evaluationEndDate
              }
            >
              {editingPeriod ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Competency Item Dialog ===== */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingComp
                ? "コンピテンシー項目を編集"
                : "コンピテンシー項目を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comp-category">カテゴリ *</Label>
                <Input
                  id="comp-category"
                  value={compForm.category}
                  onChange={(e) =>
                    setCompForm({ ...compForm, category: e.target.value })
                  }
                  placeholder="例: 業務遂行力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-name">項目名 *</Label>
                <Input
                  id="comp-name"
                  value={compForm.name}
                  onChange={(e) =>
                    setCompForm({ ...compForm, name: e.target.value })
                  }
                  placeholder="例: 問題解決力"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-desc">説明</Label>
              <Textarea
                id="comp-desc"
                value={compForm.description}
                onChange={(e) =>
                  setCompForm({ ...compForm, description: e.target.value })
                }
                placeholder="項目の説明"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>部署</Label>
                <Select
                  value={compForm.departmentId}
                  onValueChange={(v) =>
                    setCompForm({
                      ...compForm,
                      departmentId: v === "all" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部署共通" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部署共通</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-coeff">係数</Label>
                <Input
                  id="comp-coeff"
                  type="number"
                  value={compForm.coefficient}
                  onChange={(e) =>
                    setCompForm({ ...compForm, coefficient: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-sort">表示順</Label>
                <Input
                  id="comp-sort"
                  type="number"
                  value={compForm.sortOrder}
                  onChange={(e) =>
                    setCompForm({ ...compForm, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-l1">レベル1 テキスト</Label>
              <Textarea
                id="comp-l1"
                value={compForm.level1Text}
                onChange={(e) =>
                  setCompForm({ ...compForm, level1Text: e.target.value })
                }
                rows={2}
                placeholder="レベル1の基準"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-l2">レベル2 テキスト</Label>
              <Textarea
                id="comp-l2"
                value={compForm.level2Text}
                onChange={(e) =>
                  setCompForm({ ...compForm, level2Text: e.target.value })
                }
                rows={2}
                placeholder="レベル2の基準"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-l3">レベル3 テキスト</Label>
              <Textarea
                id="comp-l3"
                value={compForm.level3Text}
                onChange={(e) =>
                  setCompForm({ ...compForm, level3Text: e.target.value })
                }
                rows={2}
                placeholder="レベル3の基準"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-l4">レベル4 テキスト</Label>
              <Textarea
                id="comp-l4"
                value={compForm.level4Text}
                onChange={(e) =>
                  setCompForm({ ...compForm, level4Text: e.target.value })
                }
                rows={2}
                placeholder="レベル4の基準"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="comp-active"
                checked={compForm.isActive}
                onChange={(e) =>
                  setCompForm({ ...compForm, isActive: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="comp-active">有効</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSaveComp}
              disabled={!compForm.category || !compForm.name}
            >
              {editingComp ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
