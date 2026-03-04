"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
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
  Award,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Search,
  Download,
  Upload,
} from "lucide-react";

// --- Types ---

interface Qualification {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  _count?: { employeeQualifications: number };
}

interface Employee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
}

interface EmployeeQualification {
  id: string;
  employeeId: string;
  qualificationId: string;
  acquiredDate: string | null;
  expiryDate: string | null;
  certificateNumber: string | null;
  employee: Employee;
  qualification: {
    id: string;
    name: string;
    category: string | null;
  };
}

// --- Helpers ---

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function getExpiryStatus(expiryDate: string | null): "expired" | "soon" | "valid" | "none" {
  if (!expiryDate) return "none";
  const now = new Date();
  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiry < now) return "expired";
  if (expiry <= thirtyDaysFromNow) return "soon";
  return "valid";
}

// --- Main Component ---

export default function QualificationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("master");

  // Qualification master state
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loadingQualifications, setLoadingQualifications] = useState(true);
  const [qualDialogOpen, setQualDialogOpen] = useState(false);
  const [editingQual, setEditingQual] = useState<Qualification | null>(null);
  const [qualForm, setQualForm] = useState({ name: "", category: "", description: "" });

  // Employee qualification state
  const [empQualifications, setEmpQualifications] = useState<EmployeeQualification[]>([]);
  const [loadingEmpQual, setLoadingEmpQual] = useState(true);
  const [empQualDialogOpen, setEmpQualDialogOpen] = useState(false);
  const [empQualForm, setEmpQualForm] = useState({
    employeeId: "",
    qualificationId: "",
    acquiredDate: "",
    expiryDate: "",
    certificateNumber: "",
  });

  // Filter state
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterQualificationId, setFilterQualificationId] = useState("");

  // Employee list for selects
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "qual" | "empQual"; id: string } | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching ---

  const fetchQualifications = useCallback(async () => {
    try {
      setLoadingQualifications(true);
      const res = await fetch("/api/qualifications");
      if (res.ok) {
        const data = await res.json();
        setQualifications(data.qualifications);
      }
    } catch (error) {
      console.error("Failed to fetch qualifications:", error);
    } finally {
      setLoadingQualifications(false);
    }
  }, []);

  const fetchEmployeeQualifications = useCallback(async () => {
    try {
      setLoadingEmpQual(true);
      const params = new URLSearchParams();
      if (filterEmployeeId) params.set("employeeId", filterEmployeeId);
      if (filterQualificationId) params.set("qualificationId", filterQualificationId);

      const res = await fetch(`/api/employee-qualifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmpQualifications(data.employeeQualifications);
      }
    } catch (error) {
      console.error("Failed to fetch employee qualifications:", error);
    } finally {
      setLoadingEmpQual(false);
    }
  }, [filterEmployeeId, filterQualificationId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  }, []);

  useEffect(() => {
    fetchQualifications();
    fetchEmployees();
  }, [fetchQualifications, fetchEmployees]);

  useEffect(() => {
    if (activeTab === "employee") {
      fetchEmployeeQualifications();
    }
  }, [activeTab, fetchEmployeeQualifications]);

  // --- Qualification Master CRUD ---

  const openQualDialog = (qual?: Qualification) => {
    if (qual) {
      setEditingQual(qual);
      setQualForm({
        name: qual.name,
        category: qual.category || "",
        description: qual.description || "",
      });
    } else {
      setEditingQual(null);
      setQualForm({ name: "", category: "", description: "" });
    }
    setQualDialogOpen(true);
  };

  const handleSaveQual = async () => {
    try {
      const url = editingQual
        ? `/api/qualifications/${editingQual.id}`
        : "/api/qualifications";
      const method = editingQual ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qualForm),
      });

      if (res.ok) {
        setQualDialogOpen(false);
        fetchQualifications();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Failed to save qualification:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeleteQual = async (id: string) => {
    try {
      const res = await fetch(`/api/qualifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        fetchQualifications();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete qualification:", error);
      alert("削除に失敗しました");
    }
  };

  // --- Employee Qualification CRUD ---

  const openEmpQualDialog = () => {
    setEmpQualForm({
      employeeId: "",
      qualificationId: "",
      acquiredDate: "",
      expiryDate: "",
      certificateNumber: "",
    });
    setEmpQualDialogOpen(true);
  };

  const handleSaveEmpQual = async () => {
    try {
      const res = await fetch("/api/employee-qualifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empQualForm),
      });

      if (res.ok) {
        setEmpQualDialogOpen(false);
        fetchEmployeeQualifications();
      } else {
        const data = await res.json();
        alert(data.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Failed to save employee qualification:", error);
      alert("保存に失敗しました");
    }
  };

  const handleDeleteEmpQual = async (id: string) => {
    try {
      const res = await fetch(`/api/employee-qualifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        fetchEmployeeQualifications();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete employee qualification:", error);
      alert("削除に失敗しました");
    }
  };

  // --- Export / Import ---

  const handleExport = async () => {
    const res = await fetch("/api/employee-qualifications/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qualifications_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/employee-qualifications/import", { method: "POST", body: formData });
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        setImportResult({ created: 0, updated: 0, errors: [`サーバーエラー (HTTP ${res.status}): レスポンスの解析に失敗しました`] });
        return;
      }
      if (!res.ok) {
        const msg = (json as { error?: string })?.error ?? `サーバーエラー (HTTP ${res.status})`;
        setImportResult({ created: 0, updated: 0, errors: [msg] });
        return;
      }
      const result = json as { created: number; updated: number; errors: string[] };
      setImportResult(result);
      if (result.created > 0 || result.updated > 0) {
        fetchEmployeeQualifications();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "不明なエラーが発生しました";
      setImportResult({ created: 0, updated: 0, errors: [`ネットワークエラー: ${msg}`] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Render ---

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7" />
            資格管理
          </h1>
          <p className="text-muted-foreground">資格マスタと社員資格の管理</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="master">資格マスタ</TabsTrigger>
          <TabsTrigger value="employee">社員資格</TabsTrigger>
        </TabsList>

        {/* ===== 資格マスタ Tab ===== */}
        <TabsContent value="master" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">資格一覧</CardTitle>
              <Button onClick={() => openQualDialog()} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                新規追加
              </Button>
            </CardHeader>
            <CardContent>
              {loadingQualifications ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : qualifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  資格が登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>資格名</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead className="text-center">保有者数</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qualifications.map((qual) => (
                      <TableRow key={qual.id}>
                        <TableCell className="font-medium">{qual.name}</TableCell>
                        <TableCell>
                          {qual.category ? (
                            <Badge variant="secondary">{qual.category}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {qual.description || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {qual._count?.employeeQualifications ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openQualDialog(qual)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteTarget({ type: "qual", id: qual.id })
                              }
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

        {/* ===== 社員資格 Tab ===== */}
        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">社員資格一覧</CardTitle>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                  <Upload className="w-4 h-4 mr-1" />
                  {importing ? "取込中..." : "Excel取込"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Excel出力
                </Button>
                <Button onClick={openEmpQualDialog} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  資格割当
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {importResult && (
                <div className={`rounded-md p-4 text-sm ${
                  importResult.created === 0 && importResult.updated === 0 && importResult.errors.length > 0
                    ? "bg-red-50 border border-red-200"
                    : importResult.errors.length > 0
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-green-50 border border-green-200"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium mb-1">インポート結果</p>
                      <p className="text-muted-foreground">
                        新規登録: <span className="font-semibold text-foreground">{importResult.created}件</span>
                        {" / "}
                        更新: <span className="font-semibold text-foreground">{importResult.updated}件</span>
                        {importResult.errors.length > 0 && (
                          <>
                            {" / "}
                            エラー: <span className="font-semibold text-red-600">{importResult.errors.length}件</span>
                          </>
                        )}
                      </p>
                      {importResult.errors.length > 0 && (
                        <ul className="mt-2 space-y-1 text-red-700">
                          {importResult.errors.map((e, i) => (
                            <li key={i} className="flex gap-1">
                              <span className="shrink-0">⚠</span>
                              <span>{e}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      onClick={() => setImportResult(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0 text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">フィルタ:</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">社員</Label>
                  <Select
                    value={filterEmployeeId || "all"}
                    onValueChange={(v) =>
                      setFilterEmployeeId(v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="全社員" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全社員</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.lastName} {emp.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">資格</Label>
                  <Select
                    value={filterQualificationId || "all"}
                    onValueChange={(v) =>
                      setFilterQualificationId(v === "all" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="全資格" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全資格</SelectItem>
                      {qualifications.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterEmployeeId("");
                    setFilterQualificationId("");
                  }}
                >
                  クリア
                </Button>
              </div>

              {/* Table */}
              {loadingEmpQual ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
                  ))}
                </div>
              ) : empQualifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  社員資格が登録されていません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>社員名</TableHead>
                      <TableHead>資格名</TableHead>
                      <TableHead>取得日</TableHead>
                      <TableHead>有効期限</TableHead>
                      <TableHead>証明書番号</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empQualifications.map((eq) => {
                      const status = getExpiryStatus(eq.expiryDate);
                      return (
                        <TableRow
                          key={eq.id}
                          className={
                            status === "expired"
                              ? "bg-red-50"
                              : status === "soon"
                              ? "bg-yellow-50"
                              : ""
                          }
                        >
                          <TableCell className="font-medium">
                            {eq.employee.lastName} {eq.employee.firstName}
                          </TableCell>
                          <TableCell>{eq.qualification.name}</TableCell>
                          <TableCell>{formatDate(eq.acquiredDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {formatDate(eq.expiryDate)}
                              {status === "expired" && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  期限切れ
                                </Badge>
                              )}
                              {status === "soon" && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  期限間近
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{eq.certificateNumber || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteTarget({ type: "empQual", id: eq.id })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Qualification Master Dialog ===== */}
      <Dialog open={qualDialogOpen} onOpenChange={setQualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingQual ? "資格を編集" : "資格を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qual-name">資格名 *</Label>
              <Input
                id="qual-name"
                value={qualForm.name}
                onChange={(e) =>
                  setQualForm({ ...qualForm, name: e.target.value })
                }
                placeholder="例: 基本情報技術者"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qual-category">カテゴリ</Label>
              <Input
                id="qual-category"
                value={qualForm.category}
                onChange={(e) =>
                  setQualForm({ ...qualForm, category: e.target.value })
                }
                placeholder="例: IT資格"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qual-description">説明</Label>
              <Textarea
                id="qual-description"
                value={qualForm.description}
                onChange={(e) =>
                  setQualForm({ ...qualForm, description: e.target.value })
                }
                placeholder="資格の説明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQualDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveQual} disabled={!qualForm.name}>
              {editingQual ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Employee Qualification Assignment Dialog ===== */}
      <Dialog open={empQualDialogOpen} onOpenChange={setEmpQualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>資格を割り当て</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>社員 *</Label>
              <Select
                value={empQualForm.employeeId}
                onValueChange={(v) =>
                  setEmpQualForm({ ...empQualForm, employeeId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="社員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.lastName} {emp.firstName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>資格 *</Label>
              <Select
                value={empQualForm.qualificationId}
                onValueChange={(v) =>
                  setEmpQualForm({ ...empQualForm, qualificationId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="資格を選択" />
                </SelectTrigger>
                <SelectContent>
                  {qualifications.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-acquired">取得日</Label>
              <Input
                id="eq-acquired"
                type="date"
                value={empQualForm.acquiredDate}
                onChange={(e) =>
                  setEmpQualForm({
                    ...empQualForm,
                    acquiredDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-expiry">有効期限</Label>
              <Input
                id="eq-expiry"
                type="date"
                value={empQualForm.expiryDate}
                onChange={(e) =>
                  setEmpQualForm({
                    ...empQualForm,
                    expiryDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-cert">証明書番号</Label>
              <Input
                id="eq-cert"
                value={empQualForm.certificateNumber}
                onChange={(e) =>
                  setEmpQualForm({
                    ...empQualForm,
                    certificateNumber: e.target.value,
                  })
                }
                placeholder="例: CERT-12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmpQualDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSaveEmpQual}
              disabled={
                !empQualForm.employeeId || !empQualForm.qualificationId
              }
            >
              割り当て
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation Dialog ===== */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除確認</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget?.type === "qual"
              ? "この資格を削除してもよろしいですか？関連する社員資格も削除されます。"
              : "この社員資格の割り当てを削除してもよろしいですか？"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget?.type === "qual") {
                  handleDeleteQual(deleteTarget.id);
                } else if (deleteTarget?.type === "empQual") {
                  handleDeleteEmpQual(deleteTarget.id);
                }
              }}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
