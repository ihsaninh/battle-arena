import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Gemini requires object schemas to have at least one known property.
// Keep rubric_json lightweight but with defined keys.
const RubricSchema = z.object({
  criteria: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const MAX_OPEN_PROMPT_WORDS = 25;

export const GeneratedQuestionSchema = z.object({
  prompt: z
    .string()
    .min(10)
    .refine(
      value => value.trim().split(/\s+/).length <= MAX_OPEN_PROMPT_WORDS,
      {
        message: `Prompt must be concise (≤ ${MAX_OPEN_PROMPT_WORDS} words)`,
      }
    ),
  difficulty: z.number().int().min(1).max(3).default(2),
  rubric_json: RubricSchema.optional(),
  language: z.string().min(2).max(5).default('en'),
  category: z.string().min(1),
});

const GeneratedQuestionsSchema = z.array(GeneratedQuestionSchema);

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export async function generateQuestions(params: {
  topic?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  language: string;
  num: number;
  seed?: string | number;
  difficulty?: 1 | 2 | 3;
}): Promise<GeneratedQuestion[]> {
  const { topic, categoryName, categoryId, language, num, seed, difficulty } =
    params;
  const categoryLabel = topic || categoryName || categoryId || 'general';
  const today = new Date();
  const currentDateIso = today.toISOString().split('T')[0];
  const recencyWindowStartYear = Math.max(today.getFullYear() - 2, 2000);

  const difficultyLabel = (() => {
    if (difficulty === 1) return 'Easy';
    if (difficulty === 2) return 'Medium';
    if (difficulty === 3) return 'Hard';
    return 'Mixed (1-3)';
  })();

  const difficultyRules = difficulty
    ? `- Set the "difficulty" number to ${difficulty} for every question (aligned with ${difficultyLabel.toLowerCase()}).\n- Ensure question complexity stays within ${difficultyLabel.toLowerCase()} expectations.\n`
    : '- Vary "difficulty" values across 1 (easy), 2 (medium), and 3 (hard) to keep rounds dynamic.\n';

  const prompt = `You are generating short, open-ended quiz questions.

Category: ${categoryLabel}
Language: ${language}
Count: ${num}
Seed: ${seed ?? 'none'}
Current date (assume knowledge through this day): ${currentDateIso}
Recency focus: highlight the latest developments or perspectives from ${recencyWindowStartYear}-${today.getFullYear()} when possible.
Preferred difficulty: ${difficultyLabel}.

Rules:
${difficultyRules}- Output exactly ${num} items.
- Each item: succinct "prompt" (prefer a single sentence, always under ${MAX_OPEN_PROMPT_WORDS} words), integer "difficulty" 1..3, optional "rubric_json" (object with keys: criteria: string[], notes: string), copy "language", and string "category".
- Keep prompts diverse and unambiguous; avoid requiring code execution.
- Use clear language with minimal clauses; avoid long introductions or multiple commas.
- Do not include any safety-violating content.
- Prefer contemporary context, figures, terminology, or issues; avoid information outdated before ${recencyWindowStartYear} unless timeless fundamentals are required.
- If the truly newest facts are uncertain, craft an evergreen question but avoid outdated claims.
`;

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite'),
    schema: GeneratedQuestionsSchema,
    prompt,
    temperature: 0.4,
  });

  // Stamp language/category and enforce preferred difficulty when provided
  const items = (result.object || []).map(q => ({
    ...q,
    difficulty: difficulty ?? q.difficulty,
    language,
    category: categoryLabel,
  }));

  return items.slice(0, num);
}

// MCQ generation
export const McqChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export const GeneratedMcqQuestionSchema = z.object({
  prompt: z.string().min(10),
  difficulty: z.number().int().min(1).max(3).default(2),
  language: z.string().min(2).max(5).default('en'),
  category: z.string().min(1),
  choices: z.array(McqChoiceSchema).min(3).max(6),
  correctChoiceId: z.string().min(1),
});

const GeneratedMcqQuestionsSchema = z.array(GeneratedMcqQuestionSchema);
export type GeneratedMcqQuestion = z.infer<typeof GeneratedMcqQuestionSchema>;

export async function generateMcqQuestions(params: {
  topic?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  language: string;
  num: number;
  seed?: string | number;
  difficulty?: 1 | 2 | 3;
}): Promise<GeneratedMcqQuestion[]> {
  const { topic, categoryName, categoryId, language, num, seed, difficulty } =
    params;
  const categoryLabel = topic || categoryName || categoryId || 'general';
  const today = new Date();
  const currentDateIso = today.toISOString().split('T')[0];
  const recencyWindowStartYear = Math.max(today.getFullYear() - 2, 2000);

  const difficultyLabel = (() => {
    if (difficulty === 1) return 'Easy';
    if (difficulty === 2) return 'Medium';
    if (difficulty === 3) return 'Hard';
    return 'Mixed (1-3)';
  })();

  const creativeContexts = [
    'brief real-world example',
    'common daily situation',
    'simple problem-solving case',
    'quick comparison scenario',
    'short cause-and-effect case',
  ];

  const questionFormats = [
    'Which option best explains...',
    'Why would... be the right step?',
    'What is the main reason...',
    'How should someone respond when...',
    'What happens if...',
  ];

  const prompt = `You are an expert quiz creator generating brief, clear multiple-choice questions that stay focused and readable.

Topic: ${categoryLabel}
Language: ${language}
Count: ${num}
Seed: ${seed ?? 'none'}
Current date (assume knowledge through this day): ${currentDateIso}
Recency focus: prioritize developments, use-cases, and terminology from ${recencyWindowStartYear}-${today.getFullYear()} where relevant.
Preferred difficulty: ${difficultyLabel}.

CLARITY REQUIREMENTS:
- Keep contexts short (1-2 sentences, under 45 words).
- Use varied but simple contexts: ${creativeContexts.join(', ')}.
- Apply different straightforward question formats: ${questionFormats.join(
    '; '
  )}.
- Avoid long storytelling; go straight to the key point being tested.
- Keep language direct and ensure the challenge matches the requested difficulty.

CONTENT RULES:
- Each question must have a unique context or scenario, even if testing the same core concept.
- Use diverse question stems while keeping them direct and free of unnecessary clauses.
- Make each question engaging but not wordy; remove extra adjectives and side stories.
- Prefer stems like "How does...", "Why would...", "Which option..." over vague yes/no phrasing.
- Create plausible distractors that test common misconceptions.
- Ensure questions require actual understanding, not just memorization.
- Favor current data, trends, or practices; avoid referencing superseded standards or statistics from before ${recencyWindowStartYear} unless unavoidable.
- If no reliable recent update exists, stay factual without inventing dates and lean on enduring knowledge.

OUTPUT FORMAT:
- Exactly ${num} items as JSON
- Each item: prompt (1-2 crisp sentences with context, <45 words), difficulty (1-3), language, category, choices (exactly 4 options with id: "a"/"b"/"c"/"d" and concise text), correctChoiceId.
- ${
    difficulty
      ? `Set the "difficulty" value to ${difficulty} for every question so the game keeps a consistent challenge.`
      : 'Balance the "difficulty" values across the set (mix of 1, 2, 3).'
  }
- Make prompts contextual and scenario-based without rambling.
- Ensure all choices are plausible and test different aspects of knowledge.
- Use natural, professional language appropriate for the topic.

EXAMPLES OF APPROACHES TO AVOID:
- Do not write paragraphs or multi-sentence backstories.
- Skip overly detailed character names or settings unless essential to the question.

Generate questions that make learners think critically while keeping the wording straightforward.`;

  const result = await generateObject({
    model: google('gemini-2.5-flash-lite-preview-09-2025'),
    schema: GeneratedMcqQuestionsSchema,
    prompt,
    temperature: 0.7, // Increased temperature for more creativity
  });

  const items = (result.object || []).map(q => ({
    ...q,
    difficulty: difficulty ?? q.difficulty,
    language,
    category: categoryLabel,
  }));

  // Server-side validation: ensure unique choices and correct in set
  const validated = items.slice(0, num).map(q => {
    const seen = new Set<string>();
    const dedupChoices = q.choices.filter(c => {
      const key = `${c.id}::${c.text.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const hasCorrect = dedupChoices.some(c => c.id === q.correctChoiceId);
    return {
      ...q,
      difficulty: difficulty ?? q.difficulty,
      choices: dedupChoices.slice(0, 4),
      correctChoiceId:
        hasCorrect && dedupChoices.length >= 3
          ? q.correctChoiceId
          : dedupChoices[0]?.id || q.correctChoiceId,
    } satisfies GeneratedMcqQuestion;
  });

  return validated;
}
