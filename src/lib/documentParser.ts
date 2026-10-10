import { SourceChunk } from '../types';

export function chunkText(
  text: string,
  sourceId: string,
  sourceTitle: string,
  notebookId: string,
  chunkSize = 900,
  overlap = 100
): SourceChunk[] {
  const clean = text.replace(/\r/g, '').trim();
  if (!clean) return [];

  const chunks: SourceChunk[] = [];
  const paragraphs = clean.split(/\n\s*\n/);
  let currentChunk = '';
  let chunkIndex = 1;
  let pageNumber = 1;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect page tag e.g. [صفحة 3]
    const pageMatch = trimmed.match(/\[صفحة\s+(\d+)\]/i);
    if (pageMatch) {
      pageNumber = parseInt(pageMatch[1], 10);
    }

    if (currentChunk.length + trimmed.length > chunkSize && currentChunk.length > 200) {
      chunks.push({
        id: `${sourceId}_chunk_${chunkIndex++}`,
        sourceId,
        sourceTitle,
        notebookId,
        text: currentChunk.trim(),
        pageNumber,
      });
      // Simple overlap
      currentChunk = currentChunk.slice(-overlap) + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: `${sourceId}_chunk_${chunkIndex++}`,
      sourceId,
      sourceTitle,
      notebookId,
      text: currentChunk.trim(),
      pageNumber,
    });
  }

  return chunks;
}
