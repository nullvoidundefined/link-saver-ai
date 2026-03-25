import Anthropic from "@anthropic-ai/sdk";

import { SUMMARIZE_SYSTEM_PROMPT, buildSummarizeUserPrompt } from "app/prompts/summarize.js";
import { logger } from "app/utils/logs/logger.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamSummary(
  content: string,
  url: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  let fullText = "";

  try {
    const stream = anthropic.messages.stream(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SUMMARIZE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildSummarizeUserPrompt(content, url) }],
      },
      { signal: abortSignal },
    );

    stream.on("text", (text) => {
      fullText += text;
      callbacks.onToken(text);
    });

    const finalMessage = await stream.finalMessage();
    logger.info(
      {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      },
      "Summary stream completed",
    );
    callbacks.onDone(fullText);
  } catch (err) {
    if (abortSignal?.aborted) {
      logger.info("Summary stream aborted by client disconnect");
      return;
    }
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ err: error }, "Anthropic streaming error");
    callbacks.onError(error);
  }
}
