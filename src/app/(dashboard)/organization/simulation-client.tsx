"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Pencil,
  RotateCcw,
  Sparkles,
  Users,
  X,
  Lightbulb,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SimEmployee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  profileImage: string | null;
  workRole: string | null;
  position: { id: string; name: string; level: number } | null;
  departmentId: string | null;
  originalDepartmentId: string | null;
  originalPositionId: string | null;
  originalWorkRole: string | null;
  changed: boolean;
}

interface SimDepartment {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  employees: SimEmployee[];
  children: SimDepartment[];
}

interface DepartmentFlat {
  id: string;
  name: string;
  code: string;
}

interface PositionFlat {
  id: string;
  name: string;
  level: number;
}

type SimChange = {
  employeeId: string;
  employeeName: string;
  fromDept: string;
  toDept?: string;
  fromPosition?: string;
  toPosition?: string;
  fromRole?: string;
  toRole?: string;
  departmentId?: string | null;
  positionId?: string | null;
  workRole?: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flattenDepts(nodes: SimDepartment[]): DepartmentFlat[] {
  const result: DepartmentFlat[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, code: n.code });
    result.push(...flattenDepts(n.children));
  }
  return result;
}

function flattenEmps(nodes: SimDepartment[]): SimEmployee[] {
  const result: SimEmployee[] = [];
  for (const n of nodes) {
    result.push(...n.employees);
    result.push(...flattenEmps(n.children));
  }
  return result;
}

// Convert org tree data to sim format
function treeToSim(depts: OrgDept[]): SimDepartment[] {
  return depts.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    sortOrder: d.sortOrder,
    employees: d.employees.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      lastName: e.lastName,
      firstName: e.firstName,
      profileImage: e.profileImage,
      workRole: e.workRole,
      position: e.position,
      departmentId: d.id,
      originalDepartmentId: d.id,
      originalPositionId: e.position?.id ?? null,
      originalWorkRole: e.workRole,
      changed: false,
    })),
    children: treeToSim(d.children),
  }));
}

// Optimization suggestions
function generateSuggestions(depts: SimDepartment[]): string[] {
  const tips: string[] = [];
  const allEmps = flattenEmps(depts);

  // Depts with no employees
  const emptyDepts = flattenDepts(depts).filter(
    (d) => !allEmps.some((e) => e.departmentId === d.id)
  );
  if (emptyDepts.length > 0) {
    tips.push(`${emptyDepts.map((d) => d.name).join("・")} に所属スタッフがいません。配置をご検討ください。`);
  }

  // Grade / position analysis
  const withoutPosition = allEmps.filter((e) => !e.position);
  if (withoutPosition.length > 0) {
    tips.push(`${withoutPosition.length}名が役職未設定です（${withoutPosition.slice(0, 3).map((e) => `${e.lastName}${e.firstName}`).join("・")}${withoutPosition.length > 3 ? "…" : ""}）。`);
  }

  // Concentration check - more than 60% in one dept
  const deptCounts = new Map<string, number>();
  for (const e of allEmps) {
    if (e.departmentId) deptCounts.set(e.departmentId, (deptCounts.get(e.departmentId) ?? 0) + 1);
  }
  for (const [deptId, count] of deptCounts) {
    if (count / allEmps.length > 0.6 && allEmps.length > 5) {
      const dept = flattenDepts(depts).find((d) => d.id === deptId);
      if (dept) tips.push(`${dept.name}にスタッフが集中しています（${count}名）。分散配置をご検討ください。`);
    }
  }

  if (tips.length === 0) tips.push("現在の配置に特に問題はありません。");

  return tips;
}

// ---------------------------------------------------------------------------
// Incoming org type (from parent)
// ---------------------------------------------------------------------------

interface OrgEmployee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  profileImage: string | null;
  workRole: string | null;
  position: { id: string; name: string; level: number } | null;
}

interface OrgDept {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  employees: OrgEmployee[];
  children: OrgDept[];
}

// ---------------------------------------------------------------------------
// Draggable Employee Card
// ---------------------------------------------------------------------------

function DraggableEmpCard({
  emp,
  onEdit,
}: {
  emp: SimEmployee;
  onEdit: (emp: SimEmployee) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: emp.id,
    data: { emp },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 p-2 rounded-lg border bg-white select-none
        ${emp.changed ? "border-orange-300 bg-orange-50" : "border-gray-200"}
        ${isDragging ? "opacity-30" : "cursor-grab hover:border-blue-300 hover:shadow-sm"}
      `}
    >
      <Avatar className="w-14 h-14 shrink-0">
        <AvatarImage src={emp.profileImage ?? undefined} />
        <AvatarFallback className="text-base font-semibold">{emp.lastName?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{emp.lastName} {emp.firstName}</p>
        {emp.position && (
          <p className="text-xs text-muted-foreground truncate">{emp.position.name}{emp.workRole ? `・${emp.workRole}` : ""}</p>
        )}
      </div>
      {emp.changed && (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
      )}
      <button
        className="shrink-0 text-muted-foreground hover:text-blue-600 transition-colors"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onEdit(emp); }}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Department Column
// ---------------------------------------------------------------------------

function DroppableDeptCol({
  dept,
  allEmps,
  onEdit,
}: {
  dept: SimDepartment;
  allEmps: SimEmployee[];
  onEdit: (emp: SimEmployee) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dept.id });
  const deptEmps = allEmps.filter((e) => e.departmentId === dept.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 transition-colors min-w-[200px] min-h-[160px]
        ${isOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200 bg-gray-50/50"}
      `}
    >
      <div className="px-3 py-2.5 border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-semibold truncate">{dept.name}</p>
          <Badge variant="secondary" className="text-xs shrink-0">
            <Users className="w-3 h-3 mr-0.5" />
            {deptEmps.length}
          </Badge>
        </div>
        {/* Sub-departments info */}
        {dept.children.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{dept.children.length}班</p>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        {deptEmps.map((emp) => (
          <DraggableEmpCard key={emp.id} emp={emp} onEdit={onEdit} />
        ))}
        {deptEmps.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 py-4">
            ここにドロップ
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Employee Edit Dialog
// ---------------------------------------------------------------------------

function EditEmpDialog({
  emp,
  allDepts,
  allPositions,
  onSave,
  onClose,
}: {
  emp: SimEmployee;
  allDepts: DepartmentFlat[];
  allPositions: PositionFlat[];
  onSave: (empId: string, deptId: string, positionId: string | null, workRole: string) => void;
  onClose: () => void;
}) {
  const [deptId, setDeptId] = useState(emp.departmentId ?? "");
  const [positionId, setPositionId] = useState(emp.position?.id ?? "");
  const [workRole, setWorkRole] = useState(emp.workRole ?? "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>配置変更 — {emp.lastName} {emp.firstName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">部署</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="部署を選択" />
              </SelectTrigger>
              <SelectContent>
                {allDepts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">役職</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="役職を選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {allPositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">役割</Label>
            <Input
              className="h-9"
              placeholder="班長・リーダーなど"
              value={workRole}
              onChange={(e) => setWorkRole(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(emp.id, deptId, positionId || null, workRole);
              onClose();
            }}
          >
            変更を保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Simulation Client
// ---------------------------------------------------------------------------

export default function SimulationClient({
  initialDepartments,
}: {
  initialDepartments: OrgDept[];
}) {
  const [simDepts, setSimDepts] = useState<SimDepartment[]>(() =>
    treeToSim(initialDepartments)
  );
  const [allPositions, setAllPositions] = useState<PositionFlat[]>([]);
  const [editingEmp, setEditingEmp] = useState<SimEmployee | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [activeEmp, setActiveEmp] = useState<SimEmployee | null>(null);

  useEffect(() => {
    fetch("/api/positions")
      .then((r) => r.json())
      .then((d: { positions?: PositionFlat[] } | PositionFlat[]) => {
        const list = Array.isArray(d) ? d : (d.positions ?? []);
        setAllPositions(list);
      })
      .catch(() => {});
  }, []);

  const allDepts = useMemo(() => flattenDepts(simDepts), [simDepts]);
  const allEmps = useMemo(() => flattenEmps(simDepts), [simDepts]);

  // Collect pending changes
  const changes = useMemo<SimChange[]>(() => {
    const result: SimChange[] = [];
    for (const emp of allEmps) {
      if (!emp.changed) continue;
      const fromDept = allDepts.find((d) => d.id === emp.originalDepartmentId)?.name ?? "未設定";
      const toDept = allDepts.find((d) => d.id === emp.departmentId)?.name;
      const fromPos = allPositions.find((p) => p.id === emp.originalPositionId)?.name;
      const toPos = emp.position?.name;
      result.push({
        employeeId: emp.id,
        employeeName: `${emp.lastName} ${emp.firstName}`,
        fromDept,
        toDept: toDept !== fromDept ? toDept : undefined,
        fromPosition: fromPos,
        toPosition: toPos !== fromPos ? toPos : undefined,
        fromRole: emp.originalWorkRole ?? undefined,
        toRole: emp.workRole !== emp.originalWorkRole ? (emp.workRole ?? undefined) : undefined,
        departmentId: emp.departmentId !== emp.originalDepartmentId ? emp.departmentId : undefined,
        positionId: emp.position?.id !== emp.originalPositionId ? (emp.position?.id ?? null) : undefined,
        workRole: emp.workRole !== emp.originalWorkRole ? emp.workRole : undefined,
      });
    }
    return result;
  }, [allEmps, allDepts, allPositions]);

  const suggestions = useMemo(() => generateSuggestions(simDepts), [simDepts]);

  // Update employee in tree
  const updateEmp = useCallback(
    (empId: string, patch: Partial<SimEmployee>) => {
      setSimDepts((prev) => {
        function update(nodes: SimDepartment[]): SimDepartment[] {
          return nodes.map((n) => ({
            ...n,
            employees: n.employees.map((e) =>
              e.id === empId
                ? {
                    ...e,
                    ...patch,
                    changed: true,
                  }
                : e
            ),
            children: update(n.children),
          }));
        }
        return update(prev);
      });
    },
    []
  );

  // Move employee between departments
  const moveEmp = useCallback(
    (empId: string, newDeptId: string) => {
      setSimDepts((prev) => {
        // Find employee first
        let empToMove: SimEmployee | undefined;
        function findEmp(nodes: SimDepartment[]) {
          for (const n of nodes) {
            const found = n.employees.find((e) => e.id === empId);
            if (found) { empToMove = found; return; }
            findEmp(n.children);
          }
        }
        findEmp(prev);
        if (!empToMove) return prev;

        const updatedEmp: SimEmployee = { ...empToMove, departmentId: newDeptId, changed: true };

        function remove(nodes: SimDepartment[]): SimDepartment[] {
          return nodes.map((n) => ({
            ...n,
            employees: n.employees.filter((e) => e.id !== empId),
            children: remove(n.children),
          }));
        }
        function add(nodes: SimDepartment[]): SimDepartment[] {
          return nodes.map((n) => ({
            ...n,
            employees: n.id === newDeptId ? [...n.employees, updatedEmp] : n.employees,
            children: add(n.children),
          }));
        }
        return add(remove(prev));
      });
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveEmp(e.active.data.current?.emp ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveEmp(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const emp: SimEmployee = active.data.current?.emp;
    if (!emp || emp.departmentId === over.id) return;
    moveEmp(String(active.id), String(over.id));
  };

  const handleEditSave = (
    empId: string,
    deptId: string,
    positionId: string | null,
    workRole: string
  ) => {
    const position = allPositions.find((p) => p.id === positionId) ?? null;
    // If department changed, move first
    const emp = allEmps.find((e) => e.id === empId);
    if (emp && deptId !== emp.departmentId) {
      moveEmp(empId, deptId);
    }
    updateEmp(empId, {
      position: position ? { id: position.id, name: position.name, level: position.level } : null,
      workRole: workRole || null,
    });
  };

  const handleReset = () => {
    setSimDepts(treeToSim(initialDepartments));
    setApplySuccess(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const payload = changes.map((c) => ({
        employeeId: c.employeeId,
        ...(c.departmentId !== undefined ? { departmentId: c.departmentId } : {}),
        ...(c.positionId !== undefined ? { positionId: c.positionId } : {}),
        ...(c.workRole !== undefined ? { workRole: c.workRole } : {}),
      }));
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: payload }),
      });
      if (!res.ok) throw new Error("Failed");
      setApplySuccess(true);
      setApplyDialogOpen(false);
      // Reset original values after apply
      setSimDepts((prev) => {
        function resetOriginals(nodes: SimDepartment[]): SimDepartment[] {
          return nodes.map((n) => ({
            ...n,
            employees: n.employees.map((e) => ({
              ...e,
              originalDepartmentId: e.departmentId,
              originalPositionId: e.position?.id ?? null,
              originalWorkRole: e.workRole,
              changed: false,
            })),
            children: resetOriginals(n.children),
          }));
        }
        return resetOriginals(prev);
      });
    } catch {
      alert("本番反映に失敗しました。もう一度お試しください。");
    } finally {
      setApplying(false);
    }
  };

  // Recursively render dept columns (handles 班・グループ at any depth)
  const renderDeptCols = useCallback(
    (depts: SimDepartment[]): React.ReactNode =>
      depts.map((dept) => {
        if (dept.children.length === 0) {
          return (
            <DroppableDeptCol
              key={dept.id}
              dept={dept}
              allEmps={allEmps}
              onEdit={setEditingEmp}
            />
          );
        }
        // Has sub-departments: wrap in a group box
        const directEmps = allEmps.filter((e) => e.departmentId === dept.id);
        return (
          <div
            key={dept.id}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/40 p-2 min-w-max"
          >
            <p className="text-xs font-semibold text-slate-500 px-1 pb-0.5 border-b border-slate-200">
              {dept.name}
            </p>
            <div className="flex gap-3">
              {directEmps.length > 0 && (
                <DroppableDeptCol
                  dept={dept}
                  allEmps={allEmps}
                  onEdit={setEditingEmp}
                />
              )}
              {renderDeptCols(dept.children)}
            </div>
          </div>
        );
      }),
    [allEmps, setEditingEmp]
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-muted-foreground">
            スタッフをドラッグして部署を変更、鉛筆アイコンで役職・役割を編集できます
          </span>
        </div>
        <div className="flex items-center gap-2">
          {applySuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              本番に反映しました
            </span>
          )}
          {changes.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              変更 {changes.length}件
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={changes.length === 0}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            リセット
          </Button>
          <Button
            size="sm"
            disabled={changes.length === 0 || applying}
            onClick={() => setApplyDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {applying ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            )}
            本番に反映
          </Button>
        </div>
      </div>

      {/* Optimization suggestions */}
      <Card className="border-violet-200 bg-violet-50/50">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5 text-violet-700">
            <Lightbulb className="w-4 h-4" />
            人員配置の最適化提案
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-4">
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-xs text-violet-700 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Changes pending panel */}
      {changes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-orange-700">変更一覧（未反映）</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="space-y-1.5">
              {changes.map((c) => (
                <div key={c.employeeId} className="text-xs flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{c.employeeName}</span>
                  {c.toDept && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {c.fromDept} <ArrowRight className="w-3 h-3" /> <span className="text-orange-700 font-medium">{c.toDept}</span>
                    </span>
                  )}
                  {c.toPosition !== undefined && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      役職: {c.fromPosition ?? "なし"} <ArrowRight className="w-3 h-3" /> <span className="text-orange-700 font-medium">{c.toPosition ?? "なし"}</span>
                    </span>
                  )}
                  {c.toRole !== undefined && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      役割: {c.fromRole ?? "なし"} <ArrowRight className="w-3 h-3" /> <span className="text-orange-700 font-medium">{c.toRole ?? "なし"}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DnD board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {renderDeptCols(simDepts)}
          </div>
        </div>

        <DragOverlay>
          {activeEmp && (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-blue-400 bg-white shadow-lg opacity-95 w-60">
              <Avatar className="w-14 h-14 shrink-0">
                <AvatarImage src={activeEmp.profileImage ?? undefined} />
                <AvatarFallback className="text-base font-semibold">{activeEmp.lastName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{activeEmp.lastName} {activeEmp.firstName}</p>
                {activeEmp.position && (
                  <p className="text-xs text-muted-foreground truncate">{activeEmp.position.name}</p>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Edit dialog */}
      {editingEmp && (
        <EditEmpDialog
          emp={editingEmp}
          allDepts={allDepts}
          allPositions={allPositions}
          onSave={handleEditSave}
          onClose={() => setEditingEmp(null)}
        />
      )}

      {/* Apply confirmation */}
      {applyDialogOpen && (
        <Dialog open onOpenChange={setApplyDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>本番データに反映しますか？</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {changes.length}件の変更をスタッフ情報に反映します。この操作は取り消せません。
            </p>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setApplyDialogOpen(false)}>キャンセル</Button>
              <Button size="sm" onClick={handleApply} disabled={applying} className="bg-blue-600 hover:bg-blue-700 text-white">
                {applying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                反映する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
