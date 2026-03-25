export const SUMMARIZE_SYSTEM_PROMPT = `You are a helpful assistant that summarizes web articles.
Provide a clear, concise summary that captures the key points and main arguments.
Write in plain English, using paragraphs. Aim for 3-5 paragraphs.
If the content appears incomplete or truncated, note that the summary is based on partial content.`;

export function buildSummarizeUserPrompt(content: string, url: string): string {
  return `Please summarize the following article from ${url}:\n\n${content}`;
}
