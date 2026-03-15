"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Plus,
  ExternalLink,
  Filter,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";

interface EvaluationListItem {
  id: string;
  status: string;
  totalScore: number | null;
  rank: string | null;
  employee: {
    id: string;
    employeeCode: string;
    lastName: string;
    firstName: string;
    department: { id: string; name: string } | null;
    position: { id: string; name: string } | null;
  };
  period: {
    id: string;
    name: string;
    year: number;
    half: string;
  };
  firstEvaluator: { id: string; lastName: string; firstName: string } | null;
  secondEvaluator: { id: string; lastName: string; firstName: string } | null;
}

interface EvaluationPeriod {
  id: string;
  name: string;
  year: number;
  half: string;
}

interface Employee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  department: { name: string } | null;
}

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

const rankColors: Record<string, string> = {
  "S+": "bg-yellow-500 text-white",
  S: "bg-yellow-400 text-white",
  "A+": "bg-green-500 text-white",
  A: "bg-green-400 text-white",
  "B+": "bg-blue-500 text-white",
  B: "bg-blue-400 text-white",
  C: "bg-gray-400 text-white",
  "C-": "bg-orange-400 text-white",
  D: "bg-red-400 text-white",
  "D-": "bg-red-600 text-white",
};

export default function EvaluationsPage() {
  const { can } = useFieldPermissions();
  const [evaluations, setEvaluations] = useState<EvaluationListItem[]>([]);
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // 評価シート一括取込
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    results: { file: string; status: string; message?: string }[];
    successCount: number;
    total: number;
  } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 削除ダイアログ
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 新規作成ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const fetchEvaluations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterPeriod && filterPeriod !== "all") params.append("periodId", filterPeriod);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);

      const res = await fetch(`/api/evaluations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data);
      }
    } catch (error) {
      console.error("Failed to fetch evaluations:", error);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterStatus]);

  useEffect(() => {
    async function fetchPeriods() {
      try {
        const res = await fetch("/api/evaluation-periods");
        if (res.ok) {
          const data = await res.json();
          setPeriods(data);
        }
      } catch (error) {
        console.error("Failed to fetch periods:", error);
      }
    }

    async function fetchEmployees() {
      try {
        const res = await fetch("/api/employees?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : data.employees || []);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    }

    fetchPeriods();
    fetchEmployees();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchEvaluations();
  }, [fetchEvaluations]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/evaluations/${deleteTargetId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTargetId(null);
        fetchEvaluations();
      } else {
        const data = await res.json();
        alert(data.error || "削除に失敗しました");
      }
    } finally {
      setDeleting(false);
    }
  };

  const runImport = async (body: FormData | null) => {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/import-evaluation-sheets", {
        method: "POST",
        body: body ?? undefined,
      });
      const data = await res.json();
      if (data.results) {
        setImportResult(data);
      } else {
        setImportResult({
          results: [{ file: "-", status: "error", message: data.error || "エラーが発生しました" }],
          successCount: 0,
          total: 1,
        });
      }
      setImportDialogOpen(true);
      if ((data.successCount ?? 0) > 0) fetchEvaluations();
    } catch {
      setImportResult({
        results: [{ file: "-", status: "error", message: "通信エラーが発生しました" }],
        successCount: 0,
        total: 1,
      });
      setImportDialogOpen(true);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }
    await runImport(formData);
  };

  const handleCreate = async () => {
    if (!selectedEmployee || !selectedPeriod) return;
    setCreating(true);

    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          periodId: selectedPeriod,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setSelectedEmployee("");
        setSelectedPeriod("");
        fetchEvaluations();
      } else {
        const error = await res.json();
        alert(error.error || "作成に失敗しました");
      }
    } catch (error) {
      console.error("Failed to create evaluation:", error);
      alert("作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* hidden file input for evaluation sheet upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7" />
            評価管理
          </h1>
          <p className="text-muted-foreground">社員の人事評価を管理します</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? "取込中..." : "評価シート一括取込"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const params = filterPeriod && filterPeriod !== "all"
                ? `?periodId=${filterPeriod}`
                : "";
              window.location.href = `/api/admin/export-evaluation-sheets${params}`;
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Excel出力
          </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新規評価作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規評価を作成</DialogTitle>
              <DialogDescription>
                評価対象の社員と評価期間を選択してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">対象社員</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="社員を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.lastName} {emp.firstName}
                        {emp.department ? ` (${emp.department.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">評価期間</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="評価期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedEmployee || !selectedPeriod || creating}
              >
                {creating ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* 取込結果ダイアログ */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>評価シート取込結果</DialogTitle>
            <DialogDescription>
              {importResult
                ? `${importResult.total}件中 ${importResult.successCount}件 成功`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-1 text-sm">
              {importResult.results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 py-1 border-b last:border-0 ${
                    r.status === "error" ? "text-destructive" : "text-green-700"
                  }`}
                >
                  <span className="font-medium shrink-0">
                    {r.status === "success" ? "✓" : "✗"}
                  </span>
                  <div>
                    <div className="font-medium truncate max-w-md">
                      {r.file}
                    </div>
                    {r.message && (
                      <div className="text-xs text-muted-foreground">
                        {r.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">フィルター:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">評価期間</label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">ステータス</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            評価一覧（{evaluations.length}件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>評価データがありません</p>
              <p className="text-sm mt-1">「新規評価作成」から評価を作成してください</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>社員名</TableHead>
                  <TableHead>部署</TableHead>
                  <TableHead>評価期間</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">合計点</TableHead>
                  <TableHead>ランク</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">
                      {evaluation.employee.lastName} {evaluation.employee.firstName}
                    </TableCell>
                    <TableCell>
                      {evaluation.employee.department?.name ?? "-"}
                    </TableCell>
                    <TableCell>{evaluation.period.name}</TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[evaluation.status] || ""}
                        variant="secondary"
                      >
                        {statusLabels[evaluation.status] || evaluation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {evaluation.totalScore != null
                        ? evaluation.totalScore.toFixed(1)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {evaluation.rank ? (
                        <Badge className={rankColors[evaluation.rank] || ""}>
                          {evaluation.rank}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/evaluations/${evaluation.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            詳細
                          </Button>
                        </Link>
                        {can("evaluationManage") === "edit" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTargetId(evaluation.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>評価を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は元に戻せません。評価データ（コンピテンシー評価・KPI目標を含む）がすべて削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
