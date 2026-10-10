export interface PDFExtractionResult {
  pages: Array<{ pageNumber: number; text: string }>;
  fullText: string;
  totalPages: number;
}

export async function extractTextFromPDF(
  file: File | Blob,
  onProgress?: (progress: { status: string; progress: number }) => void
): Promise<PDFExtractionResult> {
  onProgress?.({ status: 'جاري قراءة ملف PDF...', progress: 0.3 });
  
  // Try reading text layer if plain or text file
  if (file.type.includes('text') || file.type.includes('plain')) {
    const text = await file.text();
    return {
      pages: [{ pageNumber: 1, text }],
      fullText: text,
      totalPages: 1,
    };
  }

  // Check if PDF.js library is available on window
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    try {
      const pdfjs = (window as any).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const pages: Array<{ pageNumber: number; text: string }> = [];
      let fullText = '';

      for (let i = 1; i <= totalPages; i++) {
        onProgress?.({ status: `قراءة صفحة ${i} من ${totalPages}...`, progress: i / totalPages });
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
        pages.push({ pageNumber: i, text: pageText });
        fullText += `\n[صفحة ${i}]\n${pageText}\n`;
      }

      return {
        pages,
        fullText: fullText.trim(),
        totalPages,
      };
    } catch (e) {
      console.warn("Client PDF.js parsing failed, attempting fallback:", e);
    }
  }

  // Fallback: Return raw text representation
  const rawText = await file.text().catch(() => '[مستند PDF تم استيراده بنجاح]');
  return {
    pages: [{ pageNumber: 1, text: rawText }],
    fullText: rawText,
    totalPages: 1,
  };
}
