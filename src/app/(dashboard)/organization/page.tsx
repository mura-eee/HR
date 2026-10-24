"use client";

import { useEffect, useState, useCallback } from "react";
import { useCompany } from "@/components/providers/company-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Network,
  LayoutGrid,
  Users,
  ChevronDown,
  ChevronRight,
  GitFork,
  Building2,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Employee {
  id: string;
  employeeCode: string;
  lastName: string;
  firstName: string;
  profileImage: string | null;
  isActive: boolean;
  position: {
    id: string;
    name: string;
    level: number;
  } | null;
}

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  sortOrder: number;
  employeeCount: number;
  employees: Employee[];
  children: DepartmentNode[];
}

interface CompanyGroup {
  id: string;
  name: string;
  sortOrder: number;
  totalCount: number;
  departments: DepartmentNode[];
}

// ---------------------------------------------------------------------------
// Helper: collect all department ids in a tree (for expand-all / collapse-all)
// ---------------------------------------------------------------------------

function collectIds(nodes: DepartmentNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    ids.add(node.id);
    for (const id of collectIds(node.children)) {
      ids.add(id);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Tree Node Component
// ---------------------------------------------------------------------------

function TreeNode({
  node,
  expandedIds,
  onToggle,
  isLast,
  depth,
}: {
  node: DepartmentNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  isLast: boolean;
  depth: number;
}) {
  const hasChildren = node.children.length > 0 || node.employees.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="relative">
      {/* Horizontal connector line from parent */}
      {depth > 0 && (
        <div
          className="absolute top-5 -left-6 w-6 border-t-2 border-gray-300"
          aria-hidden="true"
        />
      )}

      {/* Vertical connector line continuing downward for siblings */}
      {depth > 0 && !isLast && (
        <div
          className="absolute top-5 -left-6 h-full border-l-2 border-gray-300"
          aria-hidden="true"
        />
      )}

      {/* Vertical connector line from top to horizontal connector */}
      {depth > 0 && (
        <div
          className="absolute top-0 -left-6 h-5 border-l-2 border-gray-300"
          aria-hidden="true"
        />
      )}

      {/* Department box */}
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        className={`
          relative flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5
          shadow-sm transition-all duration-150
          ${hasChildren ? "cursor-pointer hover:shadow-md hover:border-blue-300" : "cursor-default"}
        `}
      >
        {hasChildren && (
          <span className="text-gray-500">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}

        {!hasChildren && <span className="w-4" />}

        <span className="font-medium text-sm text-gray-800">{node.name}</span>

        <Badge variant="secondary" className="ml-1 text-xs">
          <Users className="w-3 h-3 mr-0.5" />
          {node.employeeCount}
        </Badge>
      </button>

      {/* Children & Employees */}
      {hasChildren && isExpanded && (
        <div className="relative ml-10 mt-1 space-y-1">
          {/* Employees */}
          {node.employees.map((emp) => (
            <Link
              key={emp.id}
              href={`/employees/${emp.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs">
                  {emp.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {emp.lastName} {emp.firstName}
                </p>
                {emp.position && (
                  <p className="text-xs text-muted-foreground">
                    {emp.position.name}
                  </p>
                )}
              </div>
            </Link>
          ))}

          {/* Child departments */}
          {node.children.length > 1 && (
            <div
              className="absolute -left-6 top-0 border-l-2 border-gray-300"
              style={{ height: "calc(100% - 16px)" }}
              aria-hidden="true"
            />
          )}
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.id}-${index}`}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
              isLast={index === node.children.length - 1}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree View Component
// ---------------------------------------------------------------------------

function TreeView({ departments }: { departments: DepartmentNode[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    collectIds(departments)
  );

  // Re-expand all when data changes
  useEffect(() => {
    setExpandedIds(collectIds(departments));
  }, [departments]);

  const onToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(collectIds(departments));
  }, [departments]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  if (departments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        部署データがありません
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={expandAll}
          className="text-xs px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 transition-colors text-gray-700"
        >
          すべて展開
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-3 py-1.5 rounded-md border bg-white hover:bg-gray-50 transition-colors text-gray-700"
        >
          すべて折りたたむ
        </button>
      </div>

      <div className="space-y-1">
        {departments.map((dept, index) => (
          <TreeNode
            key={`${dept.id}-${index}`}
            node={dept}
            expandedIds={expandedIds}
            onToggle={onToggle}
            isLast={index === departments.length - 1}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual Org Chart
// ---------------------------------------------------------------------------

const BOX_W = 150;
const BOX_H = 58;
const PARENT_BOX_H = 72;
const EMP_ROW_H = 18;
const H_GAP = 18;
const V_GAP = 56;

interface LayoutNode {
  node: DepartmentNode;
  cx: number; // center x
  y: number;  // top y
  subtreeW: number;
  boxH: number;
  children: LayoutNode[];
}

function subtreeWidth(node: DepartmentNode): number {
  if (node.children.length === 0) return BOX_W;
  const childrenW = node.children.reduce(
    (sum, c, i) => sum + subtreeWidth(c) + (i > 0 ? H_GAP : 0),
    0
  );
  return Math.max(BOX_W, childrenW);
}

function buildLayout(node: DepartmentNode, cx: number, y: number): LayoutNode {
  const sw = subtreeWidth(node);
  // Show employees only in leaf nodes (no children)
  const showEmps = node.children.length === 0;
  const bh = showEmps
    ? BOX_H + node.employees.length * EMP_ROW_H
    : PARENT_BOX_H;
  const result: LayoutNode = { node, cx, y, subtreeW: sw, boxH: bh, children: [] };

  if (node.children.length > 0) {
    const childrenTotalW = node.children.reduce(
      (sum, c, i) => sum + subtreeWidth(c) + (i > 0 ? H_GAP : 0),
      0
    );
    let childLeft = cx - childrenTotalW / 2;
    for (const child of node.children) {
      const cw = subtreeWidth(child);
      result.children.push(buildLayout(child, childLeft + cw / 2, y + bh + V_GAP));
      childLeft += cw + H_GAP;
    }
  }
  return result;
}

function collectAll(ln: LayoutNode, nodes: LayoutNode[], edges: { x1: number; y1: number; x2: number; y2: number }[]) {
  nodes.push(ln);
  for (const child of ln.children) {
    const px = ln.cx;
    const py = ln.y + ln.boxH;
    const cy = child.y;
    const mid = py + (cy - py) / 2;
    // Elbow connector: down → horizontal → down
    edges.push({ x1: px, y1: py, x2: px, y2: mid });
    edges.push({ x1: px, y1: mid, x2: child.cx, y2: mid });
    edges.push({ x1: child.cx, y1: mid, x2: child.cx, y2: cy });
    collectAll(child, nodes, edges);
  }
}

function findTopPerson(node: DepartmentNode): Employee | null {
  let best: Employee | null = null;
  for (const emp of node.employees) {
    if (!best || (emp.position?.level ?? 0) > (best.position?.level ?? 0)) best = emp;
  }
  for (const child of node.children) {
    const cb = findTopPerson(child);
    if (cb && (!best || (cb.position?.level ?? 0) > (best.position?.level ?? 0))) best = cb;
  }
  return best;
}

function boxFill(depth: number): string {
  if (depth === 0) return "#BDD7EE"; // light blue – root
  if (depth === 1) return "#9DC3E6"; // medium blue – dept
  return "#FFFFFF";                   // white – teams
}

function VisualOrgChart({ departments }: { departments: DepartmentNode[] }) {
  const [selected, setSelected] = useState<DepartmentNode | null>(null);

  if (departments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        部署データがありません
      </div>
    );
  }

  // Build layout for all root departments side by side
  const rootLayouts: LayoutNode[] = [];
  let offsetX = BOX_W / 2;
  for (const dept of departments) {
    const sw = subtreeWidth(dept);
    rootLayouts.push(buildLayout(dept, offsetX + sw / 2, 0));
    offsetX += sw + H_GAP * 2;
  }

  const allNodes: LayoutNode[] = [];
  const allEdges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const rl of rootLayouts) collectAll(rl, allNodes, allEdges);

  const svgW = offsetX - H_GAP * 2 + BOX_W / 2 + 10;
  const svgH = Math.max(...allNodes.map((n) => n.y + n.boxH)) + 20;

  // depth lookup (keyed by LayoutNode object to handle shared dept IDs across companies)
  const depthMap = new Map<LayoutNode, number>();
  function markDepth(ln: LayoutNode, d: number) {
    depthMap.set(ln, d);
    for (const c of ln.children) markDepth(c, d + 1);
  }
  for (const rl of rootLayouts) markDepth(rl, 0);

  // total count including descendants
  function totalEmpCount(ln: LayoutNode): number {
    return ln.node.employees.length + ln.children.reduce((s, c) => s + totalEmpCount(c), 0);
  }

  // Pre-compute top person (highest position.level) for each non-leaf node
  const topPersonMap = new Map<LayoutNode, Employee>();
  for (const ln of allNodes) {
    if (ln.node.children.length > 0) {
      const tp = findTopPerson(ln.node);
      if (tp) topPersonMap.set(ln, tp);
    }
  }

  return (
    <div className="overflow-auto">
      <svg
        width={svgW}
        height={svgH}
        style={{ minWidth: svgW, display: "block" }}
      >
        {/* Connectors */}
        {allEdges.map((e, i) => (
          <line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="#94a3b8"
            strokeWidth={1.5}
          />
        ))}

        {/* Boxes */}
        {allNodes.map((ln, ni) => {
          const d = depthMap.get(ln) ?? 0;
          const fill = boxFill(d);
          const bx = ln.cx - BOX_W / 2;
          const showEmps = ln.node.children.length === 0;

          return (
            <g
              key={`node-${ni}`}
              onClick={() => setSelected(selected?.id === ln.node.id ? null : ln.node)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={bx} y={ln.y}
                width={BOX_W} height={ln.boxH}
                rx={8} ry={8}
                fill={fill}
                stroke={selected?.id === ln.node.id ? "#3b82f6" : "#94a3b8"}
                strokeWidth={selected?.id === ln.node.id ? 2 : 1}
              />
              {/* Department name */}
              <text
                x={ln.cx} y={ln.y + 18}
                textAnchor="middle"
                fontSize={11}
                fontWeight={d <= 1 ? "600" : "normal"}
                fill="#1e293b"
              >
                {ln.node.name}
              </text>
              {/* Employee count */}
              <text
                x={ln.cx} y={ln.y + 34}
                textAnchor="middle"
                fontSize={10}
                fill="#64748b"
              >
                {totalEmpCount(ln)}名
              </text>
              {/* Top person for non-leaf nodes */}
              {!showEmps && (() => {
                const tp = topPersonMap.get(ln);
                if (!tp) return null;
                const posLabel = tp.position?.name ? tp.position.name + " " : "";
                return (
                  <text x={ln.cx} y={ln.y + 50} textAnchor="middle" fontSize={9} fill="#475569" fontWeight="500">
                    {posLabel + tp.lastName + " " + tp.firstName}
                  </text>
                );
              })()}
              {/* Employees in leaf nodes (sorted by position level) */}
              {showEmps && [...ln.node.employees]
                .sort((a, b) => (b.position?.level ?? 0) - (a.position?.level ?? 0))
                .map((emp, ei) => (
                <text
                  key={`${ni}-${emp.id}`}
                  x={bx + 8} y={ln.y + BOX_H + ei * EMP_ROW_H + 13}
                  fontSize={9}
                  fill="#334155"
                >
                  {emp.lastName + " " + emp.firstName + (emp.position ? "（" + emp.position.name + "）" : "")}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Selected department detail panel */}
      {selected && (
        <div className="mt-4 border rounded-lg bg-white p-4 max-w-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-base">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          {selected.employees.length > 0 ? (
            <div className="space-y-2">
              {selected.employees.map((emp) => (
                <Link
                  key={emp.id}
                  href={`/employees/${emp.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs">{emp.lastName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{emp.lastName} {emp.firstName}</p>
                    {emp.position && <p className="text-xs text-muted-foreground">{emp.position.name}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">直属の社員はいません（子部署を展開してください）</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card View Component
// ---------------------------------------------------------------------------

function CardView({ departments }: { departments: DepartmentNode[] }) {
  // Flatten the tree into a list for card display
  const flatDepartments: DepartmentNode[] = [];

  function flatten(nodes: DepartmentNode[]) {
    for (const node of nodes) {
      flatDepartments.push(node);
      flatten(node.children);
    }
  }

  flatten(departments);

  if (flatDepartments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        部署データがありません
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {flatDepartments.map((dept, di) => (
        <Card key={`card-${di}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{dept.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-0.5" />
                {dept.employeeCount}名
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dept.employees.length > 0 ? (
              <div className="space-y-2">
                {dept.employees.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    className="flex items-center gap-3 py-1.5 border-b last:border-0 hover:bg-blue-50 rounded px-1 transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {emp.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.lastName} {emp.firstName}
                      </p>
                      {emp.position && (
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.position.name}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                所属社員はいません
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped Visual Org Chart (全体表示: 会社ごとに分けたビジュアル)
// ---------------------------------------------------------------------------

function buildUnifiedTree(companyGroups: CompanyGroup[]): DepartmentNode {
  return {
    id: "root",
    name: "トキトグループ",
    code: "ROOT",
    parentDepartmentId: null,
    sortOrder: 0,
    employeeCount: companyGroups.reduce((s, cg) => s + cg.totalCount, 0),
    employees: [],
    children: companyGroups.map((company) => ({
      id: "company-" + company.id,
      name: company.name,
      code: "COMPANY",
      parentDepartmentId: "root",
      sortOrder: company.sortOrder,
      employeeCount: company.totalCount,
      employees: [],
      children: company.departments as DepartmentNode[],
    })),
  };
}

function GroupedVisualOrgChart({ companyGroups }: { companyGroups: CompanyGroup[] }) {
  if (companyGroups.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        部署データがありません
      </div>
    );
  }
  const root = buildUnifiedTree(companyGroups);
  return (
    <Card>
      <CardContent className="pt-6">
        <VisualOrgChart departments={[root]} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Group Card View (全体表示: 会社ごとにセクション分け)
// ---------------------------------------------------------------------------

function DeptCard({ dept }: { dept: DepartmentNode }) {
  function countAll(node: DepartmentNode): number {
    return node.employees.length + node.children.reduce((s, c) => s + countAll(c), 0);
  }
  function flatEmps(node: DepartmentNode): Employee[] {
    const result: Employee[] = [...node.employees];
    for (const c of node.children) result.push(...flatEmps(c));
    return result;
  }
  function sortByPos(emps: Employee[]) {
    return [...emps].sort((a, b) => (b.position?.level ?? 0) - (a.position?.level ?? 0));
  }
  const totalCount = countAll(dept);
  const sections: { label: string | null; emps: Employee[] }[] = [];
  if (dept.children.length === 0) {
    sections.push({ label: null, emps: dept.employees });
  } else {
    if (dept.employees.length > 0) {
      sections.push({ label: "（直属）", emps: dept.employees });
    }
    for (const child of dept.children) {
      const emps = flatEmps(child);
      if (emps.length > 0) sections.push({ label: child.name, emps });
    }
  }
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-0.5" />
            {totalCount}名
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {totalCount > 0 ? (
          <div className="space-y-3">
            {sections.map((sec, si) => (
              <div key={si}>
                {sec.label && (
                  <p className="text-xs font-semibold text-blue-700 mb-1 border-b border-blue-100 pb-0.5">
                    {sec.label}
                  </p>
                )}
                <div className="space-y-1">
                  {sortByPos(sec.emps).map((emp) => (
                    <Link
                      key={emp.id}
                      href={`/employees/${emp.id}`}
                      className="flex items-center gap-2 py-1 hover:bg-blue-50 rounded px-1 transition-colors"
                    >
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {emp.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {emp.lastName} {emp.firstName}
                        </p>
                        {emp.position && (
                          <p className="text-xs text-muted-foreground truncate">
                            {emp.position.name}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">所属社員はいません</p>
        )}
      </CardContent>
    </Card>
  );
}
function GroupCardView({ companyGroups }: { companyGroups: CompanyGroup[] }) {
  if (companyGroups.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {companyGroups.map((company) => (
        <div key={company.id}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">{company.name}</h2>
            <Badge variant="outline" className="ml-1">
              <Users className="w-3 h-3 mr-0.5" />
              {company.totalCount}名
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {company.departments.map((dept) => (
              <DeptCard key={`${company.id}-${dept.id}`} dept={dept} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function OrganizationPage() {
  const { selectedCompanyId } = useCompany();
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const url = selectedCompanyId
          ? `/api/organizations?companyId=${selectedCompanyId}`
          : "/api/organizations";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments);
        }

        if (!selectedCompanyId) {
          const groupRes = await fetch("/api/organizations/group", { cache: "no-store" });
          if (groupRes.ok) {
            const groupData = await groupRes.json();
            setCompanyGroups(groupData.companies);
          }
        }
      } catch (error) {
        console.error("Failed to fetch organization data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrganization();
  }, [selectedCompanyId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">組織図</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 animate-pulse bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">組織図</h1>
        <p className="text-muted-foreground">
          部署構成と所属社員を確認できます
        </p>
      </div>

      <Tabs defaultValue="visual">
        <TabsList>
          <TabsTrigger value="visual" className="gap-1.5">
            <GitFork className="w-4 h-4" />
            ビジュアル
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-1.5">
            <Network className="w-4 h-4" />
            ツリー表示
          </TabsTrigger>
          <TabsTrigger value="card" className="gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            カード表示
          </TabsTrigger>
          {!selectedCompanyId && (
            <TabsTrigger value="group" className="gap-1.5">
              <Building2 className="w-4 h-4" />
              グループ
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="visual" className="mt-4">
          {!selectedCompanyId && companyGroups.length > 0 ? (
            <GroupedVisualOrgChart companyGroups={companyGroups} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <VisualOrgChart departments={departments} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <TreeView departments={departments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="card" className="mt-4">
          <CardView departments={departments} />
        </TabsContent>

        {!selectedCompanyId && (
          <TabsContent value="group" className="mt-4">
            <GroupCardView companyGroups={companyGroups} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
