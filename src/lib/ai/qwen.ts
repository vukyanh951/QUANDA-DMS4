import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { buildRepairPrompt } from "./buildRoadmapPrompt";
import { QUANDA_SYSTEM_PROMPT } from "./systemPrompt";

const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen3.5-flash";

type QwenCompletionParams = ChatCompletionCreateParamsNonStreaming & {
  enable_thinking: boolean;
};

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.QWEN_BASE_URL || DEFAULT_BASE_URL,
    maxRetries: 0,
  });
}

async function completeJson(
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const params: QwenCompletionParams = {
    model: process.env.QWEN_MODEL || DEFAULT_MODEL,
    messages: [
      { role: "system", content: QUANDA_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 5_000,
    response_format: { type: "json_object" },
    stream: false,
    enable_thinking: process.env.QWEN_ENABLE_THINKING === "true",
  };

  const completion = await getClient().chat.completions.create(params, {
    signal,
    timeout: 24_000,
  });
  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("Empty model response");
  return content;
}

export function callQwenForRoadmap(
  prompt: string,
  signal: AbortSignal,
): Promise<string> {
  return completeJson(prompt, signal);
}

export function repairQwenRoadmap(
  originalOutput: string,
  validationErrors: string,
  language: "en" | "vi",
  signal: AbortSignal,
): Promise<string> {
  return completeJson(
    buildRepairPrompt(originalOutput, validationErrors, language),
    signal,
  );
}
