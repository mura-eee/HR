"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

interface CEmployee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  profileImage: string | null;
  grade: number | null;
  baseSalary: number | null;
  workRole: string | null;
  gender: string | null;
  department: {
    id: string;
    name: string;
    parentDepartment: { id: string; name: string } | null;
  } | null;
  position: { id: string; name: string; level: number } | null;
  jobType: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
}

type AxisKey = "department" | "grade" | "position" | "jobType" | "gender";

const AXIS_OPTIONS: { value: AxisKey; label: string }[] = [
  { value: "department", label: "部署" },
  { value: "grade", label: "等級" },
  { value: "position", label: "役職" },
  { value: "jobType", label: "職種" },
  { value: "gender", label: "性別" },
];

function getAxisValue(emp: CEmployee, axis: AxisKey): string {
  switch (axis) {
    case "department":
      return emp.department?.parentDepartment
        ? `${emp.department.parentDepartment.name} / ${emp.department.name}`
        : emp.department?.name ?? "未設定";
    case "grade":
      return emp.grade !== null ? `${emp.grade}等級` : "未設定";
    case "position":
      return emp.position?.name ?? "未設定";
    case "jobType":
      return emp.jobType?.name ?? "未設定";
    case "gender":
      switch (emp.gender) {
        case "male": return "男性";
        case "female": return "女性";
        default: return "未設定";
      }
  }
}

function getAxisOrder(emp: CEmployee, axis: AxisKey): number {
  switch (axis) {
    case "grade": return emp.grade ?? 999;
    case "position": return emp.position ? -emp.position.level : 999;
    default: return 0;
  }
}

function sortAxisKeys(keys: string[], axis: AxisKey, employees: CEmployee[]): string[] {
  if (axis === "grade") {
    return [...keys].sort((a, b) => {
      const na = parseInt(a) || 999;
      const nb = parseInt(b) || 999;
      return na - nb;
    });
  }
  if (axis === "position") {
    const levelMap = new Map<string, number>();
    employees.forEach((e) => {
      if (e.position) levelMap.set(e.position.name, e.position.level);
    });
    return [...keys].sort((a, b) => {
      const la = a === "未設定" ? -1 : levelMap.get(a) ?? 0;
      const lb = b === "未設定" ? -1 : levelMap.get(b) ?? 0;
      return lb - la;
    });
  }
  return [...keys].sort((a, b) => {
    if (a === "未設定") return 1;
    if (b === "未設定") return -1;
    return a.localeCompare(b, "ja");
  });
}

export default function CrossTabClient({
  companyId,
}: {
  companyId: string | null;
}) {
  const [employees, setEmployees] = useState<CEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowAxis, setRowAxis] = useState<AxisKey>("department");
  const [colAxis, setColAxis] = useState<AxisKey>("grade");

  useEffect(() => {
    setLoading(true);
    const url = companyId
      ? `/api/crosstab?companyId=${companyId}`
      : "/api/crosstab";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []))
      .finally(() => setLoading(false));
  }, [companyId]);

  const { rowKeys, colKeys, matrix } = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const mat = new Map<string, Map<string, CEmployee[]>>();

    for (const emp of employees) {
      const rk = getAxisValue(emp, rowAxis);
      const ck = getAxisValue(emp, colAxis);
      rowSet.add(rk);
      colSet.add(ck);
      if (!mat.has(rk)) mat.set(rk, new Map());
      const row = mat.get(rk)!;
      if (!row.has(ck)) row.set(ck, []);
      row.get(ck)!.push(emp);
    }

    const rks = sortAxisKeys(Array.from(rowSet), rowAxis, employees);
    const cks = sortAxisKeys(Array.from(colSet), colAxis, employees);

    return { rowKeys: rks, colKeys: cks, matrix: mat };
  }, [employees, rowAxis, colAxis]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totals = {
    rows: new Map<string, number>(),
    cols: new Map<string, number>(),
    grand: employees.length,
  };
  for (const rk of rowKeys) {
    const row = matrix.get(rk);
    totals.rows.set(rk, row ? [...row.values()].reduce((s, a) => s + a.length, 0) : 0);
  }
  for (const ck of colKeys) {
    let n = 0;
    for (const rk of rowKeys) {
      n += matrix.get(rk)?.get(ck)?.length ?? 0;
    }
    totals.cols.set(ck, n);
  }

  return (
    <div className="space-y-4">
      {/* Axis selectors */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">行軸</span>
              <Select value={rowAxis} onValueChange={(v) => setRowAxis(v as AxisKey)}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AXIS_OPTIONS.filter((o) => o.value !== colAxis).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-muted-foreground">×</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">列軸</span>
              <Select value={colAxis} onValueChange={(v) => setColAxis(v as AxisKey)}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AXIS_OPTIONS.filter((o) => o.value !== rowAxis).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="ml-auto">
              <Users className="w-3 h-3 mr-1" />
              総人数: {employees.length}名
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 border-r border-b px-4 py-3 text-left font-semibold text-slate-700 min-w-[160px]">
                {AXIS_OPTIONS.find((o) => o.value === rowAxis)?.label} ＼ {AXIS_OPTIONS.find((o) => o.value === colAxis)?.label}
              </th>
              {colKeys.map((ck) => (
                <th key={ck} className="border-r border-b px-3 py-3 text-center font-semibold text-slate-700 min-w-[120px] whitespace-nowrap">
                  {ck}
                  <div className="text-xs font-normal text-slate-400">
                    {totals.cols.get(ck) ?? 0}名
                  </div>
                </th>
              ))}
              <th className="border-b px-3 py-3 text-center font-semibold text-blue-700 min-w-[72px]">
                合計
              </th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk, ri) => {
              const row = matrix.get(rk);
              const rowTotal = totals.rows.get(rk) ?? 0;
              return (
                <tr key={rk} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="sticky left-0 z-10 border-r border-b px-4 py-3 font-medium text-slate-800 whitespace-nowrap"
                    style={{ backgroundColor: ri % 2 === 0 ? "white" : "rgb(248 250 252 / 0.5)" }}
                  >
                    {rk}
                  </td>
                  {colKeys.map((ck) => {
                    const cell = row?.get(ck) ?? [];
                    return (
                      <td key={ck} className="border-r border-b px-2 py-2 align-top">
                        {cell.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {cell.map((emp) => (
                              <Link
                                key={emp.id}
                                href={`/employees/${emp.id}`}
                                title={`${emp.lastName} ${emp.firstName}${emp.position ? ` (${emp.position.name})` : ""}`}
                              >
                                <Avatar className="w-8 h-8 ring-1 ring-white hover:ring-blue-400 transition-all hover:scale-110">
                                  <AvatarImage src={emp.profileImage ?? undefined} />
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                    {emp.lastName?.[0]}{emp.firstName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                            ))}
                            <div className="w-full text-center text-xs text-slate-400 mt-0.5">
                              {cell.length}名
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-200">-</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b px-3 py-2 text-center font-bold text-blue-700">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
            {/* Total row */}
            <tr className="bg-blue-50 font-semibold">
              <td className="sticky left-0 z-10 bg-blue-50 border-r px-4 py-3 text-blue-700">合計</td>
              {colKeys.map((ck) => (
                <td key={ck} className="border-r px-3 py-3 text-center text-blue-700">
                  {totals.cols.get(ck) ?? 0}
                </td>
              ))}
              <td className="px-3 py-3 text-center text-blue-800 text-base">{employees.length}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        ※ アバターをクリックすると個人ページに移動します
      </p>
    </div>
  );
}
