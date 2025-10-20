const DEFAULT_STATUS_COLOR = "bg-gray-500/20 text-gray-400 border-gray-500/30";
const STATUS_COLOR_MAP: Record<string, string> = {
  waiting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  finished: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_BADGE_COLOR_MAP: Record<string, string> = {
  waiting: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  active: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  finished: DEFAULT_STATUS_COLOR,
};

const STATUS_LABEL_MAP: Record<string, string> = {
  waiting: "Waiting",
  active: "In Progress",
  finished: "Finished",
};

const DIFFICULTY_LABEL_MAP = {
  easy: { en: "Easy", id: "Mudah" },
  medium: { en: "Medium", id: "Sedang" },
  hard: { en: "Hard", id: "Sulit" },
} as const;

const DIFFICULTY_BADGE_COLOR_MAP: Record<string, string> = {
  easy: "bg-green-500/20 text-green-300 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-300 border-red-500/30",
};

export const formatBattleTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const getDifficultyLabel = (
  difficulty: number | string | null | undefined,
  language?: string
): string => {
  const lang = language?.toLowerCase().startsWith("id") ? "id" : "en";

  if (difficulty === null || difficulty === undefined || difficulty === "") {
    return lang === "id" ? "Campuran" : "Mixed";
  }

  if (typeof difficulty === "string") {
    const normalized = difficulty.toLowerCase() as keyof typeof DIFFICULTY_LABEL_MAP;
    const labels = DIFFICULTY_LABEL_MAP[normalized];
    if (labels) {
      return labels[lang];
    }
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  if (difficulty === 1) {
    return lang === "id" ? DIFFICULTY_LABEL_MAP.easy.id : DIFFICULTY_LABEL_MAP.easy.en;
  }
  if (difficulty === 3) {
    return lang === "id" ? DIFFICULTY_LABEL_MAP.hard.id : DIFFICULTY_LABEL_MAP.hard.en;
  }
  return lang === "id" ? DIFFICULTY_LABEL_MAP.medium.id : DIFFICULTY_LABEL_MAP.medium.en;
};

export const getDifficultyColor = (
  difficulty: number | string | null | undefined
): string => {
  if (typeof difficulty === "string") {
    const normalized = difficulty.toLowerCase();
    return DIFFICULTY_BADGE_COLOR_MAP[normalized] ?? DEFAULT_STATUS_COLOR;
  }
  if (difficulty === 1) return "text-green-400";
  if (difficulty === 3) return "text-red-400";
  return "text-yellow-400";
};

export const getRoomStatusColor = (
  status: string,
  variant: "default" | "badge" = "default"
): string => {
  if (variant === "badge") {
    return STATUS_BADGE_COLOR_MAP[status] ?? STATUS_BADGE_COLOR_MAP.finished;
  }
  return STATUS_COLOR_MAP[status] ?? DEFAULT_STATUS_COLOR;
};

export const getStatusColor = (status: string): string => {
  return getRoomStatusColor(status, "badge");
};

export const getStatusLabel = (status: string): string => {
  return STATUS_LABEL_MAP[status] ?? status;
};
