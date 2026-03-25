import { extract } from "@extractus/article-extractor";

import { logger } from "app/utils/logs/logger.js";

export interface ExtractedContent {
  title: string | null;
  content: string;
  domain: string;
}

const MAX_CONTENT_LENGTH = 100_000;

export async function fetchContent(url: string): Promise<ExtractedContent> {
  const domain = new URL(url).hostname;

  try {
    const article = await extract(url);
    if (article?.content) {
      const text = stripHtml(article.content).slice(0, MAX_CONTENT_LENGTH);
      return { title: article.title ?? null, content: text, domain };
    }
  } catch (err) {
    logger.warn({ err, url }, "Article extractor failed, falling back to basic fetch");
  }

  const text = await fallbackFetch(url);
  return { title: null, content: text.slice(0, MAX_CONTENT_LENGTH), domain };
}

async function fallbackFetch(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "LinkSaverBot/1.0" },
    });
    const html = await res.text();
    return stripHtml(html);
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
