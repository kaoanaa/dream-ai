import type { QwenMessage } from "@/lib/qwen";

export type DreamSymbol = {
  name: string;
  meaning: string;
  evidenceFromText: string;
};

export type DreamResult = {
  summary: string;
  symbols: DreamSymbol[];
  emotions: string[];
  possibleTriggers: string[];
  advice: string[];
  questionsToAskUser: string[];
  disclaimer: string;
};

export const DREAM_RESULT_JSON_SCHEMA = `{
  "summary": "string",
  "symbols": [{"name":"string","meaning":"string","evidenceFromText":"string"}],
  "emotions": ["string"],
  "possibleTriggers": ["string"],
  "advice": ["string"],
  "questionsToAskUser": ["string"],
  "disclaimer": "string"
}`;

export function buildDreamMessages(args: {
  dreamText: string;
  style: string;
  locale?: "zh-CN";
}): QwenMessage[] {
  const { dreamText, style } = args;

  const system = [
    "你是一位专业、温和的“解梦引导师”，用心理学/象征学的视角帮助用户自我探索。",
    "重要：解梦不是事实判断，不要做医学/心理/法律诊断或断言；不要暗示用户必须采取某个行动。",
    "输出必须是严格 JSON（不要 Markdown，不要代码块，不要额外文本）。字段必须与给定 schema 完全一致。",
    "内容用中文，表达清晰具体，避免玄学式夸大与恐吓。",
    "",
    "输出 JSON schema：",
    DREAM_RESULT_JSON_SCHEMA,
  ].join("\n");

  const user = [
    `风格偏好：${style}`,
    "",
    "梦境文本：",
    dreamText,
    "",
    "请从梦境文本中提取关键意象与情绪，给出多种可能解释（以“可能/也许/有时”表达），并提供可操作的小建议。",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function tryParseDreamResultJson(text: string): DreamResult | null {
  try {
    const obj = JSON.parse(text) as DreamResult;
    if (!obj || typeof obj !== "object") return null;
    if (typeof obj.summary !== "string") return null;
    if (!Array.isArray(obj.symbols)) return null;
    if (!Array.isArray(obj.emotions)) return null;
    if (!Array.isArray(obj.possibleTriggers)) return null;
    if (!Array.isArray(obj.advice)) return null;
    if (!Array.isArray(obj.questionsToAskUser)) return null;
    if (typeof obj.disclaimer !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

