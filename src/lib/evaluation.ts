export interface RankInfo {
  rank: string;
  salaryStepChange: number;
}

export function getRankFromScore(totalScore: number): RankInfo {
  if (totalScore >= 86) return { rank: "S+", salaryStepChange: 6 };
  if (totalScore >= 76) return { rank: "S", salaryStepChange: 5 };
  if (totalScore >= 71) return { rank: "A+", salaryStepChange: 4 };
  if (totalScore >= 66) return { rank: "A", salaryStepChange: 3 };
  if (totalScore >= 61) return { rank: "B+", salaryStepChange: 2 };
  if (totalScore >= 56) return { rank: "B", salaryStepChange: 1 };
  if (totalScore >= 51) return { rank: "C", salaryStepChange: 0 };
  if (totalScore >= 46) return { rank: "C-", salaryStepChange: -1 };
  if (totalScore >= 36) return { rank: "D", salaryStepChange: -2 };
  return { rank: "D-", salaryStepChange: -3 };
}

export function calculateAverageScore(
  firstScore: number | null,
  secondScore: number | null
): number | null {
  if (firstScore === null && secondScore === null) return null;
  if (firstScore === null) return secondScore;
  if (secondScore === null) return firstScore;
  return (firstScore + secondScore) / 2;
}

export function calculateConvertedScore(
  averageScore: number | null,
  coefficient: number
): number | null {
  if (averageScore === null) return null;
  return Math.ceil(averageScore * coefficient * 10) / 10;
}

export const RANK_TABLE = [
  { rank: "S+", minScore: 86, maxScore: 100, stepChange: 6, color: "bg-yellow-500" },
  { rank: "S", minScore: 76, maxScore: 86, stepChange: 5, color: "bg-yellow-400" },
  { rank: "A+", minScore: 71, maxScore: 76, stepChange: 4, color: "bg-green-500" },
  { rank: "A", minScore: 66, maxScore: 71, stepChange: 3, color: "bg-green-400" },
  { rank: "B+", minScore: 61, maxScore: 66, stepChange: 2, color: "bg-blue-500" },
  { rank: "B", minScore: 56, maxScore: 61, stepChange: 1, color: "bg-blue-400" },
  { rank: "C", minScore: 51, maxScore: 56, stepChange: 0, color: "bg-gray-400" },
  { rank: "C-", minScore: 46, maxScore: 51, stepChange: -1, color: "bg-orange-400" },
  { rank: "D", minScore: 36, maxScore: 46, stepChange: -2, color: "bg-red-400" },
  { rank: "D-", minScore: 0, maxScore: 36, stepChange: -3, color: "bg-red-600" },
];
