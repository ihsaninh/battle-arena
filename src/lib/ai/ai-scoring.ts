import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import crypto from "crypto";
import { z } from "zod";

// Simple in-memory cache for consistent scoring of identical inputs
const scoreCache = new Map<string, AIScoreResult>();
const MAX_CACHE_SIZE = 1000; // Limit cache size to prevent memory issues

// Clean cache if it gets too large
function cleanCacheIfNeeded() {
  if (scoreCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO)
    const keysToDelete = Array.from(scoreCache.keys()).slice(
      0,
      scoreCache.size - MAX_CACHE_SIZE + 100
    );
    keysToDelete.forEach((key) => scoreCache.delete(key));
  }
}

// Generate cache key for deterministic scoring
function generateCacheKey(params: {
  question: string;
  answer: string;
  category: string;
  difficulty: number;
  language?: string;
}): string {
  const { question, answer, category, difficulty, language = "en" } = params;
  const content = `${question}|${answer}|${category}|${difficulty}|${language}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Define the scoring schema for structured output
const ScoringSchema = z.object({
  score: z.number().min(0).max(100).describe("Score between 0-100"),
  feedback: z.string().describe("Detailed feedback explaining the score"),
  strengths: z.array(z.string()).describe("Key strengths in the answer"),
  improvements: z.array(z.string()).describe("Areas for improvement"),
  category: z
    .enum(["excellent", "good", "average", "poor"])
    .describe("Overall performance category"),
});

export type AIScoreResult = z.infer<typeof ScoringSchema>;

// Difficulty-based scoring adjustments
const DIFFICULTY_MULTIPLIERS = {
  1: 1.0, // easy
  2: 1.1, // medium
  3: 1.2, // hard
} as const;

// Category-specific evaluation criteria
const CATEGORY_CRITERIA = {
  tech: {
    focus:
      "technical accuracy, depth of understanding, practical examples, and industry best practices",
    keywords: [
      "implementation",
      "architecture",
      "performance",
      "scalability",
      "security",
      "best practices",
    ],
  },
  career: {
    focus:
      "professional insight, practical experience, leadership qualities, and problem-solving approach",
    keywords: [
      "leadership",
      "collaboration",
      "problem-solving",
      "growth",
      "experience",
      "teamwork",
    ],
  },
  fun: {
    focus:
      "creativity, thoughtfulness, personality expression, and engaging storytelling",
    keywords: [
      "creativity",
      "personality",
      "storytelling",
      "uniqueness",
      "engagement",
      "authenticity",
    ],
  },
} as const;

export async function evaluateAnswer(params: {
  question: string;
  answer: string;
  category: string;
  difficulty: number;
  language?: string;
  rubric?: Record<string, unknown>;
}): Promise<AIScoreResult> {
  const {
    question,
    answer,
    category,
    difficulty,
    language = "en",
    rubric,
  } = params;

  // Generate cache key for consistent scoring
  const cacheKey = generateCacheKey({
    question,
    answer,
    category,
    difficulty,
    language,
  });

  // Return cached result if available
  if (scoreCache.has(cacheKey)) {
    return scoreCache.get(cacheKey)!;
  }

  try {
    // Early guard for clearly low-effort/unknown answers
    const trimmed = answer.trim();
    const lower = trimmed.toLowerCase();
    const unknownPatterns = [
      "gak tau",
      "ga tau",
      "nggak tau",
      "ngga tau",
      "tidak tahu",
      "gak tahu",
      "entahlah",
      "idk",
      "i don't know",
      "dont know",
      "no idea",
      "not sure",
      "dunno",
      "skip",
      "pass",
    ];

    // Check for explicit "unknown" patterns first
    const isUnknown = unknownPatterns.some(
      (p) => lower === p || lower.includes(p)
    );

    // For short answers, be more lenient - only penalize if BOTH short AND clearly inadequate
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isVeryShort = wordCount < 2; // Changed from 5 to 2 words
    const isEmptyOrMeaningless =
      trimmed.length < 3 || /^[\s\-_.!?]*$/.test(trimmed);

    // Only give 0 score if it's explicitly unknown OR completely inadequate
    if (isUnknown || (isVeryShort && isEmptyOrMeaningless)) {
      return {
        score: 0,
        feedback:
          language === "id"
            ? "Belum kejawab nih. Coba tulis jawaban singkat yang langsung ke poinnya ya."
            : "No worries — try a short, direct answer to the question next time.",
        strengths: [],
        improvements:
          language === "id"
            ? [
                "Jawab lebih spesifik ke pertanyaan",
                "Tambahkan 1–2 contoh kalau bisa",
              ]
            : ["Answer more specifically", "Add 1–2 examples if possible"],
        category: "poor",
      };
    }
    // Get category-specific criteria
    const categoryKey =
      category.toLowerCase() as keyof typeof CATEGORY_CRITERIA;
    const criteria = CATEGORY_CRITERIA[categoryKey] || CATEGORY_CRITERIA.tech;

    // Build the evaluation prompt based on language
    const isIndonesian = language === "id";
    const prompt = isIndonesian
      ? `Kamu adalah evaluator AI yang santai dan suportif untuk kuis fun. Skornya harus objektif (jangan dilembekin), tapi feedback tetap santai.

**Pertanyaan:** ${question}

**Kategori:** ${category} (${getDifficultyLabel(difficulty, language)})
**Area Fokus:** ${criteria.focus}
**Area Penilaian Utama:** ${criteria.keywords.join(", ")}

**Jawaban Siswa:**
${answer}

**Panduan Evaluasi (ringan & fun):**
1. **Isi (40%)**: Seberapa relevan dan tepat dengan pertanyaan
2. **Pemahaman (25%)**: Ada gambaran paham atau sekadar permukaan
3. **Penyampaian (20%)**: Jelas, mengalir, mudah dibaca
4. **Contoh/Praktik (15%)**: Ada contoh, ilustrasi, atau insight praktis

**Skala Penilaian:**
- 90-100: Keren Banget — wawasan mantap + contoh oke
- 80-89: Mantap — penjelasan jelas dan cukup lengkap
- 70-79: Lumayan — dasar sudah ada, bisa ditambah contoh/detail
- 60-69: Perlu Latihan — masih agak tipis/kurang jelas
- <60: Belum pas — perlu lebih fokus ke pertanyaannya

${rubric ? `**Rubrik Tambahan:** ${JSON.stringify(rubric)}` : ""}

**Aturan Ketat (objektif):**
- Kalau jawabannya jelas bilang tidak tahu/"gak tau"/"idk"/"no idea" ATAU panjangnya < 5 kata ATAU off-topic, beri skor 0–10 (utamakan 0).
- Jangan menaikkan skor karena gaya bahasa; fokus pada isi.
- KONSISTENSI PENTING: Jawaban identik harus mendapat skor identik. Evaluasi berdasarkan konten faktual, bukan variasi subjektif.
- Untuk jawaban singkat yang benar tapi tidak lengkap (contoh: "Istana Bogor. dulunya markas VOC"), berikan skor konsisten 50-60 jika nama benar tapi penjelasan kurang akurat.

**Gaya Feedback:** Santai, positif, 2–4 kalimat, hindari terlalu formal. Boleh emoji seperlunya pilih salah satu sesuai konteks(🤣😅😁😭🥹).

Ikuti schema output.`
      : `You are a friendly, supportive evaluator for a fun quiz. Scoring must be objective (no inflation), feedback casual.

**Question:** ${question}

**Category:** ${category} (${getDifficultyLabel(difficulty, language)})
**Focus Areas:** ${criteria.focus}
**Key Areas to Assess:** ${criteria.keywords.join(", ")}

**Student's Answer:**
${answer}

**Evaluation Guidelines (lightweight & friendly):**
1. **Content (40%)**: Relevance and correctness
2. **Understanding (25%)**: Shows real grasp vs. surface-level
3. **Communication (20%)**: Clear, readable, and to the point
4. **Examples/Practice (15%)**: Real examples or actionable insights

**Scoring Scale:**
- 90-100: Outstanding — great insights with solid examples
- 80-89: Great — clear and reasonably complete
- 70-79: Good — basics covered, could add examples
- 60-69: Fair — a bit shallow/unclear
- <60: Needs work — not focused enough

${rubric ? `**Additional Rubric:** ${JSON.stringify(rubric)}` : ""}

Hard rules (objective):
- If the answer explicitly says "I don't know"/"idk"/"no idea" OR has < 5 words OR is clearly off-topic → score 0–10 (prefer 0).
- Do not inflate for style; focus on substance.
- CONSISTENCY CRITICAL: Identical answers must receive identical scores. Base evaluation on factual content, not subjective variation.
- For short answers that are correct but incomplete (e.g., "Istana Bogor. dulunya markas VOC"), give consistent 50-60 score if name is right but explanation inaccurate.

Tone: friendly, supportive, slightly playful. 2–4 sentences. Avoid overly formal language. Follow the schema.`;

    const result = await generateObject({
      model: google("gemini-2.5-flash-lite"),
      schema: ScoringSchema,
      prompt,
      temperature: 0.1, // Very low temperature for maximum consistency
    });

    // Apply difficulty multiplier (no extra leniency)
    const difficultyMultiplier =
      DIFFICULTY_MULTIPLIERS[
        difficulty as keyof typeof DIFFICULTY_MULTIPLIERS
      ] || 1.0;
    const adjustedScore = Math.min(
      100,
      Math.max(0, Math.round(result.object.score * difficultyMultiplier))
    );

    const finalResult = {
      ...result.object,
      score: adjustedScore,
    };

    // Cache the result for consistency
    cleanCacheIfNeeded();
    scoreCache.set(cacheKey, finalResult);

    return finalResult;
  } catch {
    // Fallback to rule-based scoring
    return generateFallbackScore(answer, category, difficulty, language);
  }
}

function getDifficultyLabel(
  difficulty: number,
  language: string = "en"
): string {
  const isIndonesian = language === "id";

  switch (difficulty) {
    case 1:
      return isIndonesian ? "Mudah" : "Easy";
    case 2:
      return isIndonesian ? "Sedang" : "Medium";
    case 3:
      return isIndonesian ? "Sulit" : "Hard";
    default:
      return isIndonesian ? "Sedang" : "Medium";
  }
}

function generateFallbackScore(
  answer: string,
  category: string,
  difficulty: number,
  language: string = "en"
): AIScoreResult {
  const isIndonesian = language === "id";
  const wordCount = answer.trim().split(/\s+/).length;
  const sentences = answer
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;

  // Category-specific keyword analysis
  const categoryKey = category.toLowerCase() as keyof typeof CATEGORY_CRITERIA;
  const criteria = CATEGORY_CRITERIA[categoryKey] || CATEGORY_CRITERIA.tech;
  const keywordMatches = criteria.keywords.filter((keyword) =>
    answer.toLowerCase().includes(keyword.toLowerCase())
  ).length;

  // Quality indicators
  const hasExamples = /for example|such as|like|including/i.test(answer);
  const hasStructure =
    /first|second|additionally|furthermore|however|therefore/i.test(answer);
  const hasProfessionalTone = wordCount >= 20 && sentences >= 2;

  // Calculate base score (more objective)
  let score = 25; // Base score

  // Early low-effort handling in fallback
  const ansLower = answer.trim().toLowerCase();
  const unknowns = [
    "gak tau",
    "ga tau",
    "nggak tau",
    "ngga tau",
    "tidak tahu",
    "gak tahu",
    "entahlah",
    "idk",
    "i don't know",
    "dont know",
    "no idea",
    "not sure",
    "dunno",
    "skip",
    "pass",
  ];

  // Check for explicit unknowns first
  const isExplicitUnknown = unknowns.some(
    (p) => ansLower === p || ansLower.includes(p)
  );

  // For short answers, be more lenient - only penalize if BOTH very short AND meaningless
  const isVeryShort = wordCount < 2;
  const isEmptyOrMeaningless =
    answer.trim().length < 3 || /^[\s\-_.!?]*$/.test(answer.trim());

  if (isExplicitUnknown || (isVeryShort && isEmptyOrMeaningless)) {
    return {
      score: 0,
      feedback: isIndonesian
        ? "Belum kejawab nih. Coba jawab lebih spesifik dan langsung ke pertanyaan."
        : "Not answered yet. Try a more specific, direct response to the question.",
      strengths: [],
      improvements: isIndonesian
        ? ["Jawab lebih spesifik", "Tambahkan 1–2 contoh"]
        : ["Answer more specifically", "Add 1–2 examples"],
      category: "poor",
    };
  }

  // Word count scoring (0-25 points) - more lenient for short but meaningful answers
  if (wordCount >= 100) score += 25;
  else if (wordCount >= 50) score += 20;
  else if (wordCount >= 30) score += 15;
  else if (wordCount >= 15) score += 10;
  else if (wordCount >= 3)
    score += 5; // Give some credit for very short but meaningful answers
  else if (wordCount >= 1) score += 2; // Minimal credit for single-word answers

  // Keyword relevance (0-20 points)
  score += Math.min(20, keywordMatches * 5);

  // Quality indicators (0-25 points)
  if (hasExamples) score += 8;
  if (hasStructure) score += 8;
  if (hasProfessionalTone) score += 9;

  // Clamp low relevance + very short answers (not just short)
  if (keywordMatches === 0 && wordCount < 3) {
    score = Math.min(score, 30);
  }

  // Adjust for difficulty
  const difficultyBonus = (difficulty - 1) * 5; // 0, 5, or 10 bonus points
  score = Math.min(100, score + difficultyBonus);

  // Determine category and feedback based on language
  let category_result: "excellent" | "good" | "average" | "poor";
  let feedback: string;
  let strengths: string[] = [];
  let improvements: string[] = [];

  if (score >= 85) {
    category_result = "excellent";
    feedback = isIndonesian
      ? "Mantap! Jawabanmu lengkap, jelas, dan ngena. Teruskan gaya ini!"
      : "Awesome! Clear, complete, and on point. Keep it up!";
    strengths = isIndonesian
      ? ["Isinya lengkap", "Penyampaian jelas", "Contoh relevan"]
      : ["Complete content", "Clear delivery", "Relevant examples"];
    improvements = isIndonesian
      ? ["Bisa tambah contoh spesifik biar makin kuat"]
      : ["Add a specific example to make it even stronger"];
  } else if (score >= 75) {
    category_result = "good";
    feedback = isIndonesian
      ? "Keren! Pemahamanmu udah dapet, tinggal tambahin contoh/detail dikit lagi."
      : "Nice! Solid understanding — add a bit more detail/examples.";
    strengths = isIndonesian
      ? ["Pemahaman oke", "Penjelasan cukup jelas"]
      : ["Good understanding", "Clear enough explanation"];
    improvements = isIndonesian
      ? ["Tambah contoh", "Rapiin alur biar makin enak dibaca"]
      : ["Add examples", "Tighten structure for flow"];
  } else if (score >= 60) {
    category_result = "average";
    feedback = isIndonesian
      ? "Lumayan! Dasarnya udah ada, coba tambah detail dan contoh ya."
      : "Not bad! Basics are there — add some detail and examples.";
    strengths = isIndonesian ? ["Dasar sudah ada"] : ["Basics present"];
    improvements = isIndonesian
      ? ["Tambah detail", "Kasih contoh", "Bikin alur lebih rapi"]
      : ["More detail", "Add examples", "Improve structure/flow"];
  } else {
    category_result = "poor";
    feedback = isIndonesian
      ? "Belum pas. Coba jawab lebih langsung, tambahin detail + contoh ya. Semangat! 💪"
      : "Not quite there. Try to be more direct, add detail + examples. You got this! 💪";
    strengths = isIndonesian ? ["Sudah mencoba"] : ["Attempt made"];
    improvements = isIndonesian
      ? [
          "Lebih detail",
          "Kasih contoh",
          "Bikin lebih jelas",
          "Fokus ke pertanyaan",
        ]
      : [
          "More detail",
          "Add examples",
          "Improve clarity",
          "Focus on the question",
        ];
  }

  return {
    score,
    feedback,
    strengths,
    improvements,
    category: category_result,
  };
}

// Helper function to validate environment
export function isAIAvailable(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

// Helper function to clear scoring cache (useful for testing or memory management)
export function clearScoringCache(): void {
  scoreCache.clear();
}

// Helper function to get cache stats
export function getScoringCacheStats(): { size: number; maxSize: number } {
  return {
    size: scoreCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
