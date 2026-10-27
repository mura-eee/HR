"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cachedFetch } from "@/lib/client-cache";
import { useCompany } from "@/components/providers/company-provider";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Download,
  Upload,
  UserX,
  FileSpreadsheet,
  History,
  Building2,
  FileDown,
  FileUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: string;
  name: string;
  code: string;
  parentDepartment: { id: string; name: string } | null;
  _count?: { employees: number };
}

interface Position {
  id: string;
  name: string;
  level: number;
}

interface Employee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  email: string;
  hireDate: string | null;
  grade: number | null;
  isActive: boolean;
  department: Department | null;
  position: Position | null;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NameHistory {
  id: string;
  lastName: string;
  firstName: string;
  changedAt: string;
  reason: string | null;
  employee: {
    id: string;
    employeeCode: string;
    lastName: string;
    firstName: string;
  };
}

type SortField = "employeeCode" | "lastName" | "hireDate" | "grade";
type SortOrder = "asc" | "desc";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

export default function EmployeesClient({
  initialEmployees,
  initialPagination,
  initialDepartments,
  initialCompanyId,
}: {
  initialEmployees: Employee[];
  initialPagination: PaginationInfo;
  initialDepartments: Department[];
  initialCompanyId: string | null;
}) {
  const router = useRouter();
  const { selectedCompanyId } = useCompany();
  const { can } = useFieldPermissions(selectedCompanyId || null);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("employeeCode");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [loading, setLoading] = useState(false);
  const [retiredEmployees, setRetiredEmployees] = useState<Employee[]>([]);
  const [retiredOpen, setRetiredOpen] = useState(false);
  const [retiredLoading, setRetiredLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [nameHistories, setNameHistories] = useState<NameHistory[]>([]);
  const [nameHistoryOpen, setNameHistoryOpen] = useState(false);
  const [nameHistoryLoading, setNameHistoryLoading] = useState(false);
  const [affiliationOpen, setAffiliationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderedCompanyId = useRef<string | null>(initialCompanyId);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: "10",
        sortField,
        sortOrder,
      });

      params.set("isActive", "true");
      if (search) params.set("search", search);
      if (departmentFilter) params.set("departmentId", departmentFilter);
      if (selectedCompanyId) params.set("companyId", selectedCompanyId);

      const res = await fetch(`/api/employees?${params.toString()}`);
      if (!res.ok) throw new Error("取得に失敗しました");

      const data = await res.json();
      setEmployees(data.employees);
      setPagination(data.pagination);
    } catch (error) {
      console.error("社員一覧取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, departmentFilter, sortField, sortOrder, selectedCompanyId]);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await cachedFetch<{ departments: Department[] } | Department[]>("/api/departments");
      setDepartments(Array.isArray(data) ? data : (data as { departments: Department[] }).departments || []);
    } catch (error) {
      console.error("部署一覧取得エラー:", error);
    }
  }, []);

  const fetchRetiredEmployees = useCallback(async () => {
    setRetiredLoading(true);
    try {
      const params = new URLSearchParams({ isActive: "false", limit: "200" });
      if (selectedCompanyId) params.set("companyId", selectedCompanyId);
      const res = await fetch(`/api/employees?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setRetiredEmployees(data.employees);
    } catch (error) {
      console.error("退職者一覧取得エラー:", error);
    } finally {
      setRetiredLoading(false);
    }
  }, [selectedCompanyId]);

  const fetchNameHistory = useCallback(async () => {
    setNameHistoryLoading(true);
    try {
      const res = await fetch("/api/employees/name-history");
      if (!res.ok) return;
      const data = await res.json();
      setNameHistories(data.histories || []);
    } catch (error) {
      console.error("氏名変更履歴取得エラー:", error);
    } finally {
      setNameHistoryLoading(false);
    }
  }, []);

  const handleToggleRetired = () => {
    if (!retiredOpen && retiredEmployees.length === 0) {
      fetchRetiredEmployees();
    }
    setRetiredOpen((prev) => !prev);
  };

  const handleToggleNameHistory = () => {
    if (!nameHistoryOpen && nameHistories.length === 0) {
      fetchNameHistory();
    }
    setNameHistoryOpen((prev) => !prev);
  };

  const handleToggleAffiliation = () => {
    if (!affiliationOpen) {
      fetchDepartments();
    }
    setAffiliationOpen((prev) => !prev);
  };

  // CompanyProviderはSSR時にnullで始まり、useLayoutEffectで実値になる。
  // nullのまま確定していない間はフェッチしない。
  const companyResolved = useRef(false);
  useEffect(() => {
    if (selectedCompanyId === null && !companyResolved.current) return;
    companyResolved.current = true;
    if (selectedCompanyId === renderedCompanyId.current) return;
    renderedCompanyId.current = selectedCompanyId;
    fetchDepartments();
    fetchEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  const isFirstParamsRender = useRef(true);
  useEffect(() => {
    if (isFirstParamsRender.current) { isFirstParamsRender.current = false; return; }
    fetchEmployees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, departmentFilter, sortField, sortOrder]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value === "all" ? "" : value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleExport = async () => {
    const res = await fetch("/api/employees/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meibo_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      const res = await fetch("/api/employees/import", { method: "POST", body: formData });
      const result = await res.json();
      setImportResult(result);
      fetchEmployees();
    } catch {
      setImportResult({ created: 0, updated: 0, errors: ["インポートに失敗しました"] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 inline opacity-40" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4 inline" />
    );
  };

  // 部署別所属人数（子部署を除く親部署のみ表示）
  const topLevelDepts = departments.filter((d) => !d.parentDepartment);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">スタッフ管理</h1>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Button>
        </Link>
      </div>

      {/* データ管理 */}
      {(can("employeeImport") !== "hidden" || can("employeeExport") !== "hidden") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              データ管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Excel出力 */}
              {can("employeeExport") !== "hidden" && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-green-600" />
                    <p className="font-medium">Excel出力（名簿）</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    在籍スタッフの名簿をExcelファイルに出力します。計上会社・勤務先・部署・役職・氏名・雇用区分を含みます。
                  </p>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Excelで出力する
                  </Button>
                </div>
              )}

              {/* Excel取込 */}
              {can("employeeImport") !== "hidden" && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-blue-600" />
                    <p className="font-medium">Excel取込</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Excelファイルからスタッフデータを一括取込します。社員コードが一致する場合は更新、存在しない場合は新規登録します。
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {importing ? "取込中..." : "Excelファイルを選択して取込"}
                  </Button>
                </div>
              )}
            </div>

            {/* インポート結果 */}
            {importResult && (
              <div className={`mt-4 rounded-md p-4 text-sm ${importResult.errors.length > 0 ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}>
                <p className="font-medium mb-1">取込結果</p>
                <p>新規登録: {importResult.created}件 / 更新: {importResult.updated}件</p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-yellow-800">
                    {importResult.errors.map((e, i) => <li key={i}>・{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 社員一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>スタッフ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="氏名・社員コードで検索..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={departmentFilter || "all"}
              onValueChange={handleDepartmentFilter}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="部署で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての部署</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const showName = can("name") !== "hidden";
            const showDepartment = can("department") !== "hidden";
            const showPosition = can("position") !== "hidden";
            const showGrade = can("grade") !== "hidden";
            const colSpan = 2 + (showName ? 1 : 0) + (showDepartment ? 1 : 0) + (showPosition ? 1 : 0) + (showGrade ? 1 : 0);

            return (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("employeeCode")}
                      >
                        社員コード
                        <SortIcon field="employeeCode" />
                      </TableHead>
                      {showName && (
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("lastName")}
                        >
                          氏名
                          <SortIcon field="lastName" />
                        </TableHead>
                      )}
                      {showDepartment && <TableHead>部署</TableHead>}
                      {showPosition && <TableHead>役職</TableHead>}
                      {showGrade && (
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("grade")}
                        >
                          等級
                          <SortIcon field="grade" />
                        </TableHead>
                      )}
                      <TableHead>ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={colSpan} className="text-center py-8">
                          読み込み中...
                        </TableCell>
                      </TableRow>
                    ) : employees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={colSpan}
                          className="text-center py-8 text-muted-foreground"
                        >
                          スタッフデータがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => (
                        <TableRow
                          key={employee.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/employees/${employee.id}`)}
                        >
                          <TableCell className="font-mono">
                            {employee.employeeCode}
                          </TableCell>
                          {showName && (
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {employee.lastName} {employee.firstName}
                                </div>
                                {employee.lastNameKana && employee.firstNameKana && (
                                  <div className="text-sm text-muted-foreground">
                                    {employee.lastNameKana} {employee.firstNameKana}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {showDepartment && (
                            <TableCell>
                              {employee.department
                                ? employee.department.parentDepartment
                                  ? `${employee.department.parentDepartment.name} / ${employee.department.name}`
                                  : employee.department.name
                                : "-"}
                            </TableCell>
                          )}
                          {showPosition && (
                            <TableCell>{employee.position?.name || "-"}</TableCell>
                          )}
                          {showGrade && (
                            <TableCell>
                              {employee.grade !== null ? `${employee.grade}等級` : "-"}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge
                              variant={employee.isActive ? "default" : "secondary"}
                            >
                              {employee.isActive ? "在籍" : "退職"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            );
          })()}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                全{pagination.total}件中{" "}
                {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}
                件を表示
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  前へ
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 2)
                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`ellipsis-${i}`} className="px-2">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={pagination.page === p ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(p)}
                          className="min-w-[36px]"
                        >
                          {p}
                        </Button>
                      )
                    )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 退職者 */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={handleToggleRetired}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <UserX className="h-5 w-5" />
              退職者
            </CardTitle>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${retiredOpen ? "rotate-180" : ""}`}
            />
          </div>
        </CardHeader>
        {retiredOpen && (
          <CardContent>
            {retiredLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
            ) : retiredEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">退職者はいません</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>社員コード</TableHead>
                      {can("name") !== "hidden" && <TableHead>氏名</TableHead>}
                      {can("department") !== "hidden" && <TableHead>部署</TableHead>}
                      {can("position") !== "hidden" && <TableHead>役職</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retiredEmployees.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer hover:bg-muted/50 opacity-70"
                        onClick={() => router.push(`/employees/${emp.id}`)}
                      >
                        <TableCell className="font-mono">{emp.employeeCode}</TableCell>
                        {can("name") !== "hidden" && (
                          <TableCell>
                            <div className="font-medium">{emp.lastName} {emp.firstName}</div>
                            {emp.lastNameKana && emp.firstNameKana && (
                              <div className="text-sm text-muted-foreground">
                                {emp.lastNameKana} {emp.firstNameKana}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {can("department") !== "hidden" && (
                          <TableCell>{emp.department?.name || "-"}</TableCell>
                        )}
                        {can("position") !== "hidden" && (
                          <TableCell>{emp.position?.name || "-"}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 氏名変更履歴 */}
      {can("name") !== "hidden" && (
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={handleToggleNameHistory}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <History className="h-5 w-5" />
                氏名変更履歴
              </CardTitle>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${nameHistoryOpen ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
          {nameHistoryOpen && (
            <CardContent>
              {nameHistoryLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">読み込み中...</p>
              ) : nameHistories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">氏名変更履歴はありません</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>社員コード</TableHead>
                        <TableHead>変更前の氏名</TableHead>
                        <TableHead>現在の氏名</TableHead>
                        <TableHead>変更日</TableHead>
                        <TableHead>変更理由</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nameHistories.map((h) => (
                        <TableRow
                          key={h.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/employees/${h.employee.id}`)}
                        >
                          <TableCell className="font-mono">{h.employee.employeeCode}</TableCell>
                          <TableCell className="text-muted-foreground">{h.lastName} {h.firstName}</TableCell>
                          <TableCell className="font-medium">{h.employee.lastName} {h.employee.firstName}</TableCell>
                          <TableCell>{formatDate(h.changedAt)}</TableCell>
                          <TableCell>
                            {h.reason ? (
                              <Badge variant="outline" className="text-xs">{h.reason}</Badge>
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* 所属一覧 */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={handleToggleAffiliation}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-5 w-5" />
              所属一覧
            </CardTitle>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${affiliationOpen ? "rotate-180" : ""}`}
            />
          </div>
        </CardHeader>
        {affiliationOpen && (
          <CardContent>
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">部署データがありません</p>
            ) : (
              <div className="space-y-4">
                {topLevelDepts.map((dept) => {
                  const childDepts = departments.filter((d) => d.parentDepartment?.id === dept.id);
                  const deptCount = dept._count?.employees ?? 0;
                  const childTotal = childDepts.reduce((sum, d) => sum + (d._count?.employees ?? 0), 0);
                  const total = deptCount + childTotal;

                  return (
                    <div key={dept.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{dept.name}</span>
                        </div>
                        <Badge variant="secondary">{total}名</Badge>
                      </div>
                      {childDepts.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {deptCount > 0 && (
                            <div className="flex items-center justify-between text-sm text-muted-foreground py-0.5">
                              <span>（本部直属）</span>
                              <span>{deptCount}名</span>
                            </div>
                          )}
                          {childDepts.map((child) => (
                            <div key={child.id} className="flex items-center justify-between text-sm py-0.5 border-l-2 pl-3">
                              <span>{child.name}</span>
                              <span className="text-muted-foreground">{child._count?.employees ?? 0}名</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* 部署未設定 */}
                {employees.filter((e) => !e.department).length > 0 && (
                  <div className="rounded-lg border border-dashed p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">部署未設定</span>
                      <Badge variant="outline">{employees.filter((e) => !e.department).length}名</Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
