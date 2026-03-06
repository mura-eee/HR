export type PermissionLevel = "edit" | "view" | "hidden";

export interface FieldDef {
  key: string;
  label: string;
}

export interface FieldGroup {
  group: string;
  fields: FieldDef[];
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    group: "基本情報",
    fields: [
      { key: "employeeCode", label: "社員コード" },
      { key: "name", label: "氏名" },
      { key: "nameKana", label: "氏名（カナ）" },
      { key: "email", label: "メールアドレス" },
      { key: "phone", label: "電話番号" },
      { key: "hireDate", label: "入社日" },
      { key: "birthDate", label: "生年月日" },
      { key: "gender", label: "性別" },
      { key: "address", label: "住所" },
    ],
  },
  {
    group: "所属・組織",
    fields: [
      { key: "company", label: "所属" },
      { key: "department", label: "部署" },
      { key: "position", label: "役職" },
      { key: "jobType", label: "職種" },
    ],
  },
  {
    group: "給与情報",
    fields: [
      { key: "grade", label: "等級" },
      { key: "salaryStep", label: "号俸" },
      { key: "baseSalary", label: "基本給" },
      { key: "qualificationAllowance", label: "資格手当" },
      { key: "positionAllowance", label: "役職手当" },
      { key: "otherAllowance1", label: "その他手当①" },
      { key: "otherAllowance2", label: "その他手当②" },
      { key: "otherAllowance3", label: "その他手当③" },
    ],
  },
  {
    group: "社会保険",
    fields: [
      { key: "healthInsurance", label: "健康保険" },
      { key: "pension", label: "厚生年金" },
      { key: "basicPensionNumber", label: "基礎年金番号" },
      { key: "employmentInsurance", label: "雇用保険" },
      { key: "bloodType", label: "血液型" },
    ],
  },
  {
    group: "緊急連絡先",
    fields: [
      { key: "emergencyContact", label: "緊急連絡先" },
    ],
  },
  {
    group: "評価情報",
    fields: [
      { key: "evaluationCompetency", label: "コンピテンシー評価" },
      { key: "evaluationKpi", label: "KPI評価" },
      { key: "evaluationSummary", label: "評価サマリー（スコア・ランク）" },
      { key: "evaluationSalaryStep", label: "号俸変動" },
    ],
  },
];

export const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

// 対象タイプ: ユーザー、所属会社、役職
export type TargetType = "user" | "company" | "position";

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  user: "ユーザー",
  company: "所属会社",
  position: "役職",
};

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  edit: "編集可能",
  view: "閲覧のみ",
  hidden: "非表示",
};

// 優先順位: user > company > position（高優先度が低優先度を上書き）
export const TARGET_PRIORITY: TargetType[] = ["user", "company", "position"];
