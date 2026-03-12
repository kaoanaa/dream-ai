// qiniu-qwen.ts

export type QwenRole = "system" | "user" | "assistant";

export type QwenMessage = {
  role: QwenRole;
  content: string;
};

// 七牛云推理响应类型 (OpenAI 兼容格式)
type QiniuInferenceResponse = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    // 非流式响应使用 message
    message?: { 
      role?: string; 
      content?: string;
    };
    // 流式响应使用 delta
    delta?: { 
      role?: string; 
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
    param?: string | null;
  };
};

export class QiniuError extends Error {
  readonly code?: string | number;
  readonly requestId?: string;

  constructor(message: string, opts?: { code?: string | number; requestId?: string }) {
    super(message);
    this.name = "QiniuError";
    this.code = opts?.code;
    this.requestId = opts?.requestId;
  }
}

// 获取七牛云推理基础 URL (支持环境变量覆盖)
function getQiniuBaseUrl(): string {
  // 默认使用七牛云模型中心 OpenAI 兼容接口
  return (
    process.env.QINIU_INFERENCE_BASE_URL?.trim() ||
    "https://llm.qiniuapi.com/v1"
  );
}

// 获取七牛云 API Key (推理专用 Token)
function getQiniuApiKey(): string {
  const key = process.env.QINIU_INFERENCE_TOKEN?.trim();
  if (!key) {
    throw new QiniuError(
      "缺少 QINIU_INFERENCE_TOKEN，请在环境变量中配置七牛云推理授权 Token。"
    );
  }
  return key;
}

// 拼接 URL 工具函数
function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

export async function qwenGenerateText(args: {
  model?: string;           // 七牛云支持的模型名，如 "qwen2.5-7b-instruct"
  messages: QwenMessage[];  // 对话消息数组
  temperature?: number;     // 采样温度 [0, 2]
  topP?: number;            // 核采样阈值 [0, 1]
  maxTokens?: number;       // 最大生成 token 数
  timeoutMs?: number;       // 请求超时时间 (毫秒)
}): Promise<{ text: string; requestId?: string }> {
  const {
    model = "minimax/minimax-m2.5",  // 默认模型，请根据七牛云实际支持的模型调整
    messages,
    temperature = 0.7,
    topP = 0.9,
    maxTokens = 1400,
    timeoutMs = 30_000,
  } = args;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = getQiniuBaseUrl();
    const apiKey = getQiniuApiKey();

    // 七牛云使用 OpenAI 兼容的 /chat/completions 接口
    const res = await fetch(joinUrl(baseUrl, "/chat/completions"), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // 可选：添加用户代理或自定义头
        // "User-Agent": "my-app/1.0",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        // 七牛云可能支持的额外参数（按需启用）:
        // stream: false,
        // presence_penalty: 0,
        // frequency_penalty: 0,
      }),
      signal: controller.signal,
    });

    // 提取请求 ID（用于问题追踪）
    const requestId =
      res.headers.get("x-request-id") ||
      res.headers.get("request-id") ||
      undefined;

    // 解析响应 JSON
    const data = (await res.json().catch(() => ({}))) as QiniuInferenceResponse;

    // 处理 HTTP 错误状态
    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        `七牛云推理请求失败（HTTP ${res.status}）`;
      const errorCode = data?.error?.code || res.status;
      throw new QiniuError(errorMsg, { code: errorCode, requestId });
    }

    // 提取生成文本
    const choice = data.choices?.[0];
    const text = choice?.message?.content?.trim() || "";

    if (!text) {
      throw new QiniuError("七牛云返回内容为空，请检查模型或输入参数。", {
        requestId,
      });
    }

    return { text, requestId };
  } catch (e) {
    // 透传自定义错误
    if (e instanceof QiniuError) {
      throw e;
    }
    // 处理超时
    if (e instanceof Error && e.name === "AbortError") {
      throw new QiniuError("七牛云推理调用超时，请稍后重试或增大 timeoutMs。");
    }
    // 处理网络或其他未知错误
    const msg = e instanceof Error ? e.message : "调用七牛云推理服务失败";
    throw new QiniuError(msg);
  } finally {
    clearTimeout(timer);
  }
}

// ============ 可选：流式输出支持 ============
/**
 * 流式调用七牛云推理接口（返回 AsyncIterable<string>）
 * 注意：需确保七牛云模型支持 stream=true 且返回 SSE 格式
 */
export async function* qwenGenerateTextStream(args: {
  model?: string;
  messages: QwenMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): AsyncIterableIterator<string> {
  const {
    model = "minimax/minimax-m2.5",
    messages,
    temperature = 0.7,
    topP = 0.9,
    maxTokens = 1400,
    timeoutMs = 60_000, // 流式建议更长超时
  } = args;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = getQiniuBaseUrl();
    const apiKey = getQiniuApiKey();

    const res = await fetch(joinUrl(baseUrl, "/chat/completions"), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream", // 声明需要 SSE 流
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true, // 启用流式
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "");
      throw new QiniuError(
        `流式请求失败: ${res.status} ${errorText}`,
        { code: res.status }
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // 解析 SSE 格式: data: {...}\n\n
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") {
            return;
          }
          try {
            const data = JSON.parse(dataStr) as QiniuInferenceResponse;
            // 流式响应使用 delta.content
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // 忽略解析失败的片段
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}