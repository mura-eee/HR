"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  ChevronRight,
  Plus,
  Trash2,
  Calculator,
  Trophy,
  User,
  Calendar,
  Building2,
  Briefcase,
} from "lucide-react";
import {
  getRankFromScore,
  calculateAverageScore,
  calculateConvertedScore,
  RANK_TABLE,
} from "@/lib/evaluation";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";

// ---------- Type Definitions ----------

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
}

interface CompetencyEvaluation {
  id: string;
  evaluationId: string;
  competencyItemId: string;
  competencyItem: CompetencyItem;
  firstScore: number | null;
  secondScore: number | null;
  averageScore: number | null;
  convertedScore: number | null;
  firstComment: string | null;
  secondComment: string | null;
}

interface KpiGoal {
  id: string;
  evaluationId: string;
  title: string;
  detail: string | null;
  criteria: string | null;
  coefficient: number;
  level1Text: string | null;
  level2Text: string | null;
  level3Text: string | null;
  level4Text: string | null;
  level5Text: string | null;
  sortOrder: number;
  selfComment: string | null;
  firstComment: string | null;
  secondComment: string | null;
  firstScore: number | null;
  secondScore: number | null;
  averageScore: number | null;
  convertedScore: number | null;
}

interface EvaluationData {
  id: string;
  employeeId: string;
  periodId: string;
  status: string;
  competencyScore: number | null;
  kpiScore: number | null;
  totalScore: number | null;
  rank: string | null;
  salaryStepChange: number | null;
  employee: {
    id: string;
    employeeCode: string;
    lastName: string;
    firstName: string;
    department: { id: string; name: string } | null;
    position: { id: string; name: string } | null;
    grade: number;
    salaryStep: number;
    baseSalary: number;
  };
  period: {
    id: string;
    name: string;
    year: number;
    half: string;
    assessmentStartDate: string;
    assessmentEndDate: string;
    evaluationStartDate: string;
    evaluationEndDate: string;
  };
  firstEvaluator: { id: string; lastName: string; firstName: string } | null;
  secondEvaluator: { id: string; lastName: string; firstName: string } | null;
  competencyEvaluations: CompetencyEvaluation[];
  kpiGoals: KpiGoal[];
}

// ---------- Status Constants ----------

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

const statusFlow: Record<string, { next: string; label: string }> = {
  DRAFT: { next: "SELF_EVAL", label: "自己評価を開始" },
  SELF_EVAL: { next: "FIRST_EVAL", label: "自己評価を完了して1次評価へ" },
  FIRST_EVAL: { next: "SECOND_EVAL", label: "1次評価を完了して2次評価へ" },
  SECOND_EVAL: { next: "COMPLETED", label: "2次評価を完了" },
};

// ---------- Main Component ----------

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const evaluationId = params.id as string;
  const { can } = useFieldPermissions();

  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [addKpiDialogOpen, setAddKpiDialogOpen] = useState(false);
  const [newKpiTitle, setNewKpiTitle] = useState("");
  const [deleteKpiId, setDeleteKpiId] = useState<string | null>(null);

  // Local state for real-time calculation
  const [competencyScores, setCompetencyScores] = useState<
    Record<string, { firstScore: number | null; secondScore: number | null; firstComment: string; secondComment: string }>
  >({});
  const [kpiData, setKpiData] = useState<
    Record<string, {
      firstScore: number | null;
      secondScore: number | null;
      selfComment: string;
      firstComment: string;
      secondComment: string;
      title: string;
      detail: string;
      criteria: string;
      coefficient: number;
      level1Text: string;
      level2Text: string;
      level3Text: string;
      level4Text: string;
      level5Text: string;
    }>
  >({});

  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`);
      if (res.ok) {
        const data: EvaluationData = await res.json();
        setEvaluation(data);

        // Initialize local state from fetched data
        const cScores: typeof competencyScores = {};
        data.competencyEvaluations.forEach((ce) => {
          cScores[ce.id] = {
            firstScore: ce.firstScore,
            secondScore: ce.secondScore,
            firstComment: ce.firstComment || "",
            secondComment: ce.secondComment || "",
          };
        });
        setCompetencyScores(cScores);

        const kData: typeof kpiData = {};
        data.kpiGoals.forEach((kpi) => {
          kData[kpi.id] = {
            firstScore: kpi.firstScore,
            secondScore: kpi.secondScore,
            selfComment: kpi.selfComment || "",
            firstComment: kpi.firstComment || "",
            secondComment: kpi.secondComment || "",
            title: kpi.title,
            detail: kpi.detail || "",
            criteria: kpi.criteria || "",
            coefficient: kpi.coefficient,
            level1Text: kpi.level1Text || "",
            level2Text: kpi.level2Text || "",
            level3Text: kpi.level3Text || "",
            level4Text: kpi.level4Text || "",
            level5Text: kpi.level5Text || "",
          };
        });
        setKpiData(kData);
      }
    } catch (error) {
      console.error("Failed to fetch evaluation:", error);
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  // ---------- Calculated Values ----------

  const getCompetencyCalc = useCallback(
    (ce: CompetencyEvaluation) => {
      const local = competencyScores[ce.id];
      if (!local) return { avg: ce.averageScore, converted: ce.convertedScore };
      const avg = calculateAverageScore(local.firstScore, local.secondScore);
      const converted = calculateConvertedScore(avg, ce.competencyItem.coefficient);
      return { avg, converted };
    },
    [competencyScores]
  );

  const getKpiCalc = useCallback(
    (kpi: KpiGoal) => {
      const local = kpiData[kpi.id];
      if (!local) return { avg: kpi.averageScore, converted: kpi.convertedScore };
      const avg = calculateAverageScore(local.firstScore, local.secondScore);
      const converted = calculateConvertedScore(avg, local.coefficient);
      return { avg, converted };
    },
    [kpiData]
  );

  const competencySubtotal =
    evaluation?.competencyEvaluations.reduce((sum, ce) => {
      const { converted } = getCompetencyCalc(ce);
      return sum + (converted ?? 0);
    }, 0) ?? 0;

  const kpiSubtotal =
    evaluation?.kpiGoals.reduce((sum, kpi) => {
      const { converted } = getKpiCalc(kpi);
      return sum + (converted ?? 0);
    }, 0) ?? 0;

  const totalScore = Math.round((competencySubtotal + kpiSubtotal) * 10) / 10;
  const currentRank = getRankFromScore(totalScore);

  const isReadOnly = evaluation?.status === "COMPLETED";

  // ---------- Auto-save on blur ----------

  const saveCompetencyField = useCallback(
    async (ceId: string) => {
      if (!evaluation || isReadOnly) return;
      const local = competencyScores[ceId];
      if (!local) return;

      const ce = evaluation.competencyEvaluations.find((c) => c.id === ceId);
      if (!ce) return;

      setSaving(true);
      try {
        await fetch(`/api/evaluations/${evaluationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competencyEvaluations: [
              {
                id: ceId,
                competencyItemId: ce.competencyItemId,
                firstScore: local.firstScore,
                secondScore: local.secondScore,
                firstComment: local.firstComment,
                secondComment: local.secondComment,
              },
            ],
          }),
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setSaving(false);
      }
    },
    [evaluation, evaluationId, competencyScores, isReadOnly]
  );

  const saveKpiField = useCallback(
    async (kpiId: string) => {
      if (!evaluation || isReadOnly) return;
      const local = kpiData[kpiId];
      if (!local) return;

      setSaving(true);
      try {
        await fetch(`/api/evaluations/${evaluationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kpiGoals: [
              {
                id: kpiId,
                title: local.title,
                detail: local.detail,
                criteria: local.criteria,
                coefficient: local.coefficient,
                level1Text: local.level1Text,
                level2Text: local.level2Text,
                level3Text: local.level3Text,
                level4Text: local.level4Text,
                level5Text: local.level5Text,
                selfComment: local.selfComment,
                firstComment: local.firstComment,
                secondComment: local.secondComment,
                firstScore: local.firstScore,
                secondScore: local.secondScore,
              },
            ],
          }),
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setSaving(false);
      }
    },
    [evaluation, evaluationId, kpiData, isReadOnly]
  );

  // ---------- Status Transition ----------

  const handleStatusChange = async () => {
    if (!evaluation) return;
    const flow = statusFlow[evaluation.status];
    if (!flow) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: flow.next }),
      });

      if (res.ok) {
        await fetchEvaluation();
        setStatusDialogOpen(false);
      }
    } catch (error) {
      console.error("Status change failed:", error);
    } finally {
      setSaving(false);
    }
  };

  // ---------- KPI Goal Management ----------

  const handleAddKpiGoal = async () => {
    if (!newKpiTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addKpiGoal: { title: newKpiTitle },
        }),
      });

      if (res.ok) {
        setNewKpiTitle("");
        setAddKpiDialogOpen(false);
        await fetchEvaluation();
      }
    } catch (error) {
      console.error("Failed to add KPI goal:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKpiGoal = async () => {
    if (!deleteKpiId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeKpiGoalId: deleteKpiId }),
      });

      if (res.ok) {
        setDeleteKpiId(null);
        await fetchEvaluation();
      }
    } catch (error) {
      console.error("Failed to remove KPI goal:", error);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Helpers ----------

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  // ---------- Loading & Error States ----------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse bg-gray-200 rounded" />
        <div className="h-40 animate-pulse bg-gray-200 rounded" />
        <div className="h-96 animate-pulse bg-gray-200 rounded" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">評価が見つかりません</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/evaluations")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/evaluations")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            一覧へ戻る
          </Button>
          <h1 className="text-xl font-bold">人事評価シート</h1>
          <Badge className={statusColors[evaluation.status]} variant="secondary">
            {statusLabels[evaluation.status]}
          </Badge>
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="w-3 h-3 animate-spin" />
              保存中...
            </span>
          )}
        </div>

        {!isReadOnly && statusFlow[evaluation.status] && (
          <Button onClick={() => setStatusDialogOpen(true)}>
            {statusFlow[evaluation.status].label}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* =============== SECTION 1: Header =============== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            評価基本情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">査定対象期間:</span>
              <span className="text-sm font-medium">
                {formatDate(evaluation.period.assessmentStartDate)} 〜{" "}
                {formatDate(evaluation.period.assessmentEndDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">評価実施期間:</span>
              <span className="text-sm font-medium">
                {formatDate(evaluation.period.evaluationStartDate)} 〜{" "}
                {formatDate(evaluation.period.evaluationEndDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">評価期間名:</span>
              <span className="text-sm font-medium">{evaluation.period.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">氏名:</span>
              <span className="text-sm font-medium">
                {evaluation.employee.lastName} {evaluation.employee.firstName}
                <span className="text-muted-foreground ml-1">({evaluation.employee.employeeCode})</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">部署:</span>
              <span className="text-sm font-medium">{evaluation.employee.department?.name ?? "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">役職:</span>
              <span className="text-sm font-medium">{evaluation.employee.position?.name ?? "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">等級:</span>
              <span className="text-sm font-medium">{evaluation.employee.grade != null ? `${evaluation.employee.grade}等級` : "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">1次評価者:</span>
              <span className="text-sm font-medium">
                {evaluation.firstEvaluator
                  ? `${evaluation.firstEvaluator.lastName} ${evaluation.firstEvaluator.firstName}`
                  : "未設定"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">2次評価者:</span>
              <span className="text-sm font-medium">
                {evaluation.secondEvaluator
                  ? `${evaluation.secondEvaluator.lastName} ${evaluation.secondEvaluator.firstName}`
                  : "未設定"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Competency and KPI */}
      <Tabs defaultValue={can("evaluationCompetency") !== "hidden" ? "competency" : can("evaluationKpi") !== "hidden" ? "kpi" : "summary"} className="w-full">
        <TabsList>
          {can("evaluationCompetency") !== "hidden" && (
            <TabsTrigger value="competency">コンピテンシー評価（40%）</TabsTrigger>
          )}
          {can("evaluationKpi") !== "hidden" && (
            <TabsTrigger value="kpi">KPI目標評価（60%）</TabsTrigger>
          )}
          {can("evaluationSummary") !== "hidden" && (
            <TabsTrigger value="summary">最終評価サマリー</TabsTrigger>
          )}
        </TabsList>

        {/* =============== SECTION 2: Competency Evaluation =============== */}
        {can("evaluationCompetency") !== "hidden" && <TabsContent value="competency">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                コンピテンシー評価（配点: 40点満点）
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="min-w-[80px]">カテゴリ</TableHead>
                      <TableHead className="min-w-[100px]">項目</TableHead>
                      <TableHead className="min-w-[150px]">詳細</TableHead>
                      <TableHead className="text-center min-w-[50px]">係数</TableHead>
                      <TableHead className="min-w-[120px] text-center bg-blue-100">レベル1</TableHead>
                      <TableHead className="min-w-[120px] text-center bg-blue-100">レベル2</TableHead>
                      <TableHead className="min-w-[120px] text-center bg-blue-100">レベル3</TableHead>
                      <TableHead className="min-w-[120px] text-center bg-blue-100">レベル4</TableHead>
                      <TableHead className="min-w-[140px]">1次コメント</TableHead>
                      <TableHead className="min-w-[140px]">2次コメント</TableHead>
                      <TableHead className="text-center min-w-[70px]">1次評価</TableHead>
                      <TableHead className="text-center min-w-[70px]">2次評価</TableHead>
                      <TableHead className="text-center min-w-[60px]">平均</TableHead>
                      <TableHead className="text-center min-w-[70px]">換算点</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluation.competencyEvaluations.map((ce) => {
                      const local = competencyScores[ce.id];
                      const { avg, converted } = getCompetencyCalc(ce);
                      const firstScoreVal = local?.firstScore ?? ce.firstScore;
                      const secondScoreVal = local?.secondScore ?? ce.secondScore;

                      return (
                        <TableRow key={ce.id}>
                          <TableCell className="text-xs font-medium align-top whitespace-normal break-words">
                            {ce.competencyItem.category}
                          </TableCell>
                          <TableCell className="text-xs font-medium align-top whitespace-normal break-words">
                            {ce.competencyItem.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground align-top whitespace-normal break-words">
                            {ce.competencyItem.description || "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm align-top">
                            {ce.competencyItem.coefficient}
                          </TableCell>
                          {/* Level columns with highlighting */}
                          {[1, 2, 3, 4].map((level) => {
                            const levelKey = `level${level}Text` as keyof CompetencyItem;
                            const text = ce.competencyItem[levelKey] as string | null;
                            const isFirst = firstScoreVal === level;
                            const isSecond = secondScoreVal === level;
                            return (
                              <TableCell
                                key={level}
                                className={`text-xs align-top ${
                                  isFirst && isSecond
                                    ? "bg-green-100 ring-2 ring-green-400 ring-inset"
                                    : isFirst
                                    ? "bg-blue-50 ring-2 ring-blue-300 ring-inset"
                                    : isSecond
                                    ? "bg-purple-50 ring-2 ring-purple-300 ring-inset"
                                    : ""
                                }`}
                              >
                                <div className="w-[120px] whitespace-normal break-words">
                                  {text || "-"}
                                  {(isFirst || isSecond) && (
                                    <div className="flex gap-1 mt-1">
                                      {isFirst && (
                                        <span className="text-[10px] bg-blue-500 text-white px-1 rounded">
                                          1次
                                        </span>
                                      )}
                                      {isSecond && (
                                        <span className="text-[10px] bg-purple-500 text-white px-1 rounded">
                                          2次
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          {/* 1st Comment */}
                          <TableCell className="align-top">
                            <Textarea
                              value={local?.firstComment ?? ce.firstComment ?? ""}
                              onChange={(e) =>
                                setCompetencyScores((prev) => ({
                                  ...prev,
                                  [ce.id]: {
                                    ...prev[ce.id],
                                    firstComment: e.target.value,
                                  },
                                }))
                              }
                              onBlur={() => saveCompetencyField(ce.id)}
                              disabled={isReadOnly}
                              className="min-h-[60px] text-xs w-[130px]"
                              placeholder="コメント..."
                            />
                          </TableCell>
                          {/* 2nd Comment */}
                          <TableCell className="align-top">
                            <Textarea
                              value={local?.secondComment ?? ce.secondComment ?? ""}
                              onChange={(e) =>
                                setCompetencyScores((prev) => ({
                                  ...prev,
                                  [ce.id]: {
                                    ...prev[ce.id],
                                    secondComment: e.target.value,
                                  },
                                }))
                              }
                              onBlur={() => saveCompetencyField(ce.id)}
                              disabled={isReadOnly}
                              className="min-h-[60px] text-xs w-[130px]"
                              placeholder="コメント..."
                            />
                          </TableCell>
                          {/* 1st Score */}
                          <TableCell className="text-center align-top">
                            <Select
                              value={firstScoreVal?.toString() || ""}
                              onValueChange={(val) => {
                                const score = parseInt(val);
                                setCompetencyScores((prev) => ({
                                  ...prev,
                                  [ce.id]: {
                                    ...prev[ce.id],
                                    firstScore: score,
                                  },
                                }));
                                // Auto-save after selection
                                setTimeout(() => saveCompetencyField(ce.id), 100);
                              }}
                              disabled={isReadOnly}
                            >
                              <SelectTrigger className="w-[60px]">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4].map((s) => (
                                  <SelectItem key={s} value={s.toString()}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {/* 2nd Score */}
                          <TableCell className="text-center align-top">
                            <Select
                              value={secondScoreVal?.toString() || ""}
                              onValueChange={(val) => {
                                const score = parseInt(val);
                                setCompetencyScores((prev) => ({
                                  ...prev,
                                  [ce.id]: {
                                    ...prev[ce.id],
                                    secondScore: score,
                                  },
                                }));
                                setTimeout(() => saveCompetencyField(ce.id), 100);
                              }}
                              disabled={isReadOnly}
                            >
                              <SelectTrigger className="w-[60px]">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4].map((s) => (
                                  <SelectItem key={s} value={s.toString()}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {/* Average */}
                          <TableCell className="text-center font-mono text-sm align-top">
                            {avg != null ? avg.toFixed(1) : "-"}
                          </TableCell>
                          {/* Converted Score */}
                          <TableCell className="text-center font-mono text-sm font-bold align-top">
                            {converted != null ? converted.toFixed(1) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-blue-50 font-bold">
                      <TableCell colSpan={13} className="text-right">
                        コンピテンシー小計（40点満点）
                      </TableCell>
                      <TableCell className="text-center font-mono text-lg">
                        {competencySubtotal.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* =============== SECTION 3: KPI Evaluation =============== */}
        {can("evaluationKpi") !== "hidden" && <TabsContent value="kpi">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  KPI目標評価（配点: 60点満点）
                </CardTitle>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddKpiDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    目標を追加
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-50">
                      <TableHead className="min-w-[120px]">目標</TableHead>
                      <TableHead className="min-w-[140px]">詳細</TableHead>
                      <TableHead className="min-w-[100px]">目標設定項目</TableHead>
                      <TableHead className="text-center min-w-[50px]">係数</TableHead>
                      <TableHead className="min-w-[100px] text-center bg-green-100">レベル1</TableHead>
                      <TableHead className="min-w-[100px] text-center bg-green-100">レベル2</TableHead>
                      <TableHead className="min-w-[100px] text-center bg-green-100">レベル3</TableHead>
                      <TableHead className="min-w-[100px] text-center bg-green-100">レベル4</TableHead>
                      <TableHead className="min-w-[100px] text-center bg-green-100">レベル5</TableHead>
                      <TableHead className="min-w-[120px]">自己評価コメント</TableHead>
                      <TableHead className="min-w-[120px]">1次コメント</TableHead>
                      <TableHead className="min-w-[120px]">2次コメント</TableHead>
                      <TableHead className="text-center min-w-[70px]">1次評価</TableHead>
                      <TableHead className="text-center min-w-[70px]">2次評価</TableHead>
                      <TableHead className="text-center min-w-[60px]">平均</TableHead>
                      <TableHead className="text-center min-w-[70px]">換算点</TableHead>
                      {!isReadOnly && <TableHead className="min-w-[40px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluation.kpiGoals.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isReadOnly ? 16 : 17}
                          className="text-center py-8 text-muted-foreground"
                        >
                          KPI目標がありません。「目標を追加」から追加してください。
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluation.kpiGoals.map((kpi) => {
                        const local = kpiData[kpi.id];
                        const { avg, converted } = getKpiCalc(kpi);
                        const firstScoreVal = local?.firstScore ?? kpi.firstScore;
                        const secondScoreVal = local?.secondScore ?? kpi.secondScore;

                        return (
                          <TableRow key={kpi.id}>
                            {/* Title */}
                            <TableCell className="align-top">
                              <Input
                                value={local?.title ?? kpi.title}
                                onChange={(e) =>
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      title: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveKpiField(kpi.id)}
                                disabled={isReadOnly}
                                className="text-xs w-[110px]"
                              />
                            </TableCell>
                            {/* Detail */}
                            <TableCell className="align-top">
                              <Textarea
                                value={local?.detail ?? kpi.detail ?? ""}
                                onChange={(e) =>
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      detail: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveKpiField(kpi.id)}
                                disabled={isReadOnly}
                                className="min-h-[50px] text-xs w-[130px]"
                              />
                            </TableCell>
                            {/* Criteria */}
                            <TableCell className="align-top">
                              <Input
                                value={local?.criteria ?? kpi.criteria ?? ""}
                                onChange={(e) =>
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      criteria: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveKpiField(kpi.id)}
                                disabled={isReadOnly}
                                className="text-xs w-[90px]"
                              />
                            </TableCell>
                            {/* Coefficient */}
                            <TableCell className="text-center align-top">
                              <Select
                                value={(local?.coefficient ?? kpi.coefficient)?.toString()}
                                onValueChange={(val) => {
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      coefficient: parseInt(val),
                                    },
                                  }));
                                  setTimeout(() => saveKpiField(kpi.id), 100);
                                }}
                                disabled={isReadOnly}
                              >
                                <SelectTrigger className="w-[55px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((c) => (
                                    <SelectItem key={c} value={c.toString()}>
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {/* Level 1-5 */}
                            {[1, 2, 3, 4, 5].map((level) => {
                              const levelKey = `level${level}Text` as keyof KpiGoal;
                              const localKey = `level${level}Text` as keyof typeof local;
                              const text = (local?.[localKey] as string) ?? (kpi[levelKey] as string | null) ?? "";
                              const isFirst = firstScoreVal === level;
                              const isSecond = secondScoreVal === level;

                              return (
                                <TableCell
                                  key={level}
                                  className={`text-xs align-top ${
                                    isFirst && isSecond
                                      ? "bg-green-100 ring-2 ring-green-400 ring-inset"
                                      : isFirst
                                      ? "bg-blue-50 ring-2 ring-blue-300 ring-inset"
                                      : isSecond
                                      ? "bg-purple-50 ring-2 ring-purple-300 ring-inset"
                                      : ""
                                  }`}
                                >
                                  <div className="w-[95px] whitespace-normal break-words">
                                    {isReadOnly ? (
                                      <span>{text || "-"}</span>
                                    ) : (
                                      <Textarea
                                        value={text}
                                        onChange={(e) =>
                                          setKpiData((prev) => ({
                                            ...prev,
                                            [kpi.id]: {
                                              ...prev[kpi.id],
                                              [localKey]: e.target.value,
                                            },
                                          }))
                                        }
                                        onBlur={() => saveKpiField(kpi.id)}
                                        className="min-h-[40px] text-xs w-[95px]"
                                        placeholder={`レベル${level}`}
                                      />
                                    )}
                                    {(isFirst || isSecond) && (
                                      <div className="flex gap-1 mt-1">
                                        {isFirst && (
                                          <span className="text-[10px] bg-blue-500 text-white px-1 rounded">
                                            1次
                                          </span>
                                        )}
                                        {isSecond && (
                                          <span className="text-[10px] bg-purple-500 text-white px-1 rounded">
                                            2次
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                            {/* Self Comment */}
                            <TableCell className="align-top">
                              <Textarea
                                value={local?.selfComment ?? kpi.selfComment ?? ""}
                                onChange={(e) =>
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      selfComment: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveKpiField(kpi.id)}
                                disabled={isReadOnly}
                                className="min-h-[50px] text-xs w-[110px]"
                                placeholder="自己評価..."
                              />
                            </TableCell>
                            {/* 1st Comment */}
                            <TableCell className="align-top">
                              <Textarea
                                value={local?.firstComment ?? kpi.firstComment ?? ""}
                                onChange={(e) =>
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      firstComment: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveKpiField(kpi.id)}
                                disabled={isReadOnly}
                                className="min-h-[50px] text-xs w-[110px]"
                                placeholder="コメント..."
                              />
                            </TableCell>
                            {/* 2nd Comment */}
                            <TableCell className="align-top">
                              <Textarea
                                value={local?.secondComment ?? kpi.secondComment ?? ""}
                                onChange={(e) =>
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      secondComment: e.target.value,
                                    },
                                  }))
                                }
                                onBlur={() => saveKpiField(kpi.id)}
                                disabled={isReadOnly}
                                className="min-h-[50px] text-xs w-[110px]"
                                placeholder="コメント..."
                              />
                            </TableCell>
                            {/* 1st Score */}
                            <TableCell className="text-center align-top">
                              <Select
                                value={firstScoreVal?.toString() || ""}
                                onValueChange={(val) => {
                                  const score = parseInt(val);
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      firstScore: score,
                                    },
                                  }));
                                  setTimeout(() => saveKpiField(kpi.id), 100);
                                }}
                                disabled={isReadOnly}
                              >
                                <SelectTrigger className="w-[60px]">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <SelectItem key={s} value={s.toString()}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {/* 2nd Score */}
                            <TableCell className="text-center align-top">
                              <Select
                                value={secondScoreVal?.toString() || ""}
                                onValueChange={(val) => {
                                  const score = parseInt(val);
                                  setKpiData((prev) => ({
                                    ...prev,
                                    [kpi.id]: {
                                      ...prev[kpi.id],
                                      secondScore: score,
                                    },
                                  }));
                                  setTimeout(() => saveKpiField(kpi.id), 100);
                                }}
                                disabled={isReadOnly}
                              >
                                <SelectTrigger className="w-[60px]">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <SelectItem key={s} value={s.toString()}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            {/* Average */}
                            <TableCell className="text-center font-mono text-sm align-top">
                              {avg != null ? avg.toFixed(1) : "-"}
                            </TableCell>
                            {/* Converted Score */}
                            <TableCell className="text-center font-mono text-sm font-bold align-top">
                              {converted != null ? converted.toFixed(1) : "-"}
                            </TableCell>
                            {/* Delete */}
                            {!isReadOnly && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeleteKpiId(kpi.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-green-50 font-bold">
                      <TableCell colSpan={isReadOnly ? 15 : 16} className="text-right">
                        KPI小計（60点満点）
                      </TableCell>
                      <TableCell className="text-center font-mono text-lg" colSpan={isReadOnly ? undefined : 1}>
                        {kpiSubtotal.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* =============== SECTION 4: Final Score Summary =============== */}
        {can("evaluationSummary") !== "hidden" && <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  評価結果サマリー
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Competency Score */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">コンピテンシー小計</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-blue-700">
                      {competencySubtotal.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 40点</span>
                  </div>
                </div>

                {/* KPI Score */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">KPI小計</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-green-700">
                      {kpiSubtotal.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 60点</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-lg">
                  <span className="text-sm font-bold">合計得点</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xl font-bold">
                      {totalScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">/ 100点</span>
                  </div>
                </div>

                {/* Rank */}
                <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-bold">評価ランク</span>
                  </div>
                  <Badge className={`text-lg px-4 py-1 ${rankColors[currentRank.rank] || ""}`}>
                    {currentRank.rank}
                  </Badge>
                </div>

                {/* Salary Step Change */}
                {can("evaluationSalaryStep") !== "hidden" && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">号俸変動</span>
                      <span
                        className={`font-mono text-lg font-bold ${
                          currentRank.salaryStepChange > 0
                            ? "text-green-600"
                            : currentRank.salaryStepChange < 0
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {currentRank.salaryStepChange > 0
                          ? `+${currentRank.salaryStepChange}`
                          : currentRank.salaryStepChange}
                      </span>
                    </div>

                    {/* Current Employee Info */}
                    <div className="p-3 rounded-lg border bg-gray-50 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">現在の等級</span>
                        <span className="font-medium">{evaluation.employee.grade != null ? `${evaluation.employee.grade}等級` : "-"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">現在の号俸</span>
                        <span className="font-medium">{evaluation.employee.salaryStep != null ? `${evaluation.employee.salaryStep}号` : "-"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">評価後の号俸</span>
                        <span className="font-bold">
                          {Math.max(1, evaluation.employee.salaryStep + currentRank.salaryStepChange)}号
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rank Reference Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ランク基準表</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ランク</TableHead>
                      <TableHead className="text-center">得点範囲</TableHead>
                      <TableHead className="text-center">号俸変動</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RANK_TABLE.map((row) => (
                      <TableRow
                        key={row.rank}
                        className={
                          currentRank.rank === row.rank
                            ? "ring-2 ring-inset ring-yellow-400 bg-yellow-50"
                            : ""
                        }
                      >
                        <TableCell>
                          <Badge className={`${row.color} text-white`}>
                            {row.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {row.minScore} 〜 {row.maxScore}
                        </TableCell>
                        <TableCell
                          className={`text-center font-mono text-sm font-bold ${
                            row.stepChange > 0
                              ? "text-green-600"
                              : row.stepChange < 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {row.stepChange > 0 ? `+${row.stepChange}` : row.stepChange}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>}
      </Tabs>

      {/* =============== Status Change Confirmation Dialog =============== */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ステータスの変更</DialogTitle>
            <DialogDescription>
              評価ステータスを「{statusLabels[evaluation.status]}」から
              「{statusLabels[statusFlow[evaluation.status]?.next || ""]}」に変更します。
              この操作は取り消せません。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleStatusChange} disabled={saving}>
              {saving ? "処理中..." : "変更する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============== Add KPI Goal Dialog =============== */}
      <Dialog open={addKpiDialogOpen} onOpenChange={setAddKpiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KPI目標の追加</DialogTitle>
            <DialogDescription>
              新しいKPI目標のタイトルを入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newKpiTitle}
              onChange={(e) => setNewKpiTitle(e.target.value)}
              placeholder="目標タイトル"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddKpiDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddKpiGoal} disabled={!newKpiTitle.trim() || saving}>
              {saving ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =============== Delete KPI Goal Confirmation Dialog =============== */}
      <Dialog open={!!deleteKpiId} onOpenChange={() => setDeleteKpiId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KPI目標の削除</DialogTitle>
            <DialogDescription>
              この目標を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKpiId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleRemoveKpiGoal} disabled={saving}>
              {saving ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
