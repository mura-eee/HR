"use client";

import { useEffect, useState, useCallback } from "react";
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
              key={child.id}
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
            key={dept.id}
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
      {flatDepartments.map((dept) => (
        <Card key={dept.id}>
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
// Main Page Component
// ---------------------------------------------------------------------------

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments);
        }
      } catch (error) {
        console.error("Failed to fetch organization data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrganization();
  }, []);

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

      <Tabs defaultValue="tree">
        <TabsList>
          <TabsTrigger value="tree" className="gap-1.5">
            <Network className="w-4 h-4" />
            ツリー表示
          </TabsTrigger>
          <TabsTrigger value="card" className="gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            カード表示
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
