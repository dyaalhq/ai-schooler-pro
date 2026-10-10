import React from 'react';
import katex from 'katex';

interface EducationalContentProps {
  content: string;
  className?: string;
}

export const EducationalContent: React.FC<EducationalContentProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  // Process and render LaTeX formulas safely using KaTeX
  const renderFormattedContent = (rawText: string) => {
    // 1. Process block display math ($$...$$)
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const segments: Array<{ type: 'text' | 'block-math'; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockMathRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          value: rawText.slice(lastIndex, match.index),
        });
      }
      segments.push({
        type: 'block-math',
        value: match[1].trim(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < rawText.length) {
      segments.push({
        type: 'text',
        value: rawText.slice(lastIndex),
      });
    }

    return segments.map((seg, idx) => {
      if (seg.type === 'block-math') {
        let renderedMath = '';
        try {
          renderedMath = katex.renderToString(seg.value, {
            displayMode: true,
            throwOnError: false,
          });
        } catch (e: any) {
          renderedMath = `<div class="text-rose-500 font-mono text-xs">${seg.value}</div>`;
        }
        return (
          <div
            key={`bm-${idx}`}
            className="my-3 overflow-x-auto text-center p-2 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/50 dark:border-teal-800/40"
            dir="ltr"
            dangerouslySetInnerHTML={{ __html: renderedMath }}
          />
        );
      }

      // Render markdown text lines & inline math
      const lines = seg.value.split('\n');
      return (
        <div key={`txt-${idx}`} className="space-y-1.5">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} className="h-1.5" />;

            // Header 1 (#)
            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={lIdx} className="text-lg sm:text-xl font-black text-teal-900 dark:text-teal-200 mt-4 mb-2 pb-1 border-b border-teal-500/20">
                  {renderInlineMathAndMarkdown(trimmed.replace('# ', ''))}
                </h1>
              );
            }

            // Header 2 (##)
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={lIdx} className="text-base sm:text-lg font-extrabold text-teal-800 dark:text-teal-300 mt-3 mb-1.5">
                  {renderInlineMathAndMarkdown(trimmed.replace('## ', ''))}
                </h2>
              );
            }

            // Header 3 (###)
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={lIdx} className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1">
                  {renderInlineMathAndMarkdown(trimmed.replace('### ', ''))}
                </h3>
              );
            }

            // Bullet points
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pr-2 my-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 mt-2 shrink-0" />
                  <span className="leading-relaxed text-xs sm:text-sm">
                    {renderInlineMathAndMarkdown(trimmed.replace(/^[-*]\s+/, ''))}
                  </span>
                </div>
              );
            }

            // Numbered list
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
            if (numMatch) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pr-2 my-1 font-medium">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 font-mono mt-0.5 shrink-0">
                    {numMatch[1]}.
                  </span>
                  <span className="leading-relaxed text-xs sm:text-sm">
                    {renderInlineMathAndMarkdown(numMatch[2])}
                  </span>
                </div>
              );
            }

            // Blockquote (>)
            if (trimmed.startsWith('> ')) {
              return (
                <blockquote key={lIdx} className="p-3 my-2 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border-r-4 border-teal-600 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  {renderInlineMathAndMarkdown(trimmed.replace(/^>\s*/, ''))}
                </blockquote>
              );
            }

            return (
              <p key={lIdx} className="leading-relaxed text-xs sm:text-sm">
                {renderInlineMathAndMarkdown(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Helper to parse inline math ($...$) and bold (**...**)
  const renderInlineMathAndMarkdown = (text: string): React.ReactNode => {
    // Split by inline math ($...$)
    const parts = text.split(/(\$[^\$\n]+\$)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const mathContent = part.slice(1, -1);
        try {
          const rendered = katex.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={`im-${pIdx}`}
              dir="ltr"
              className="inline-block px-1 font-mono align-baseline"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          );
        } catch {
          return <span key={`im-${pIdx}`} className="font-mono text-xs">{part}</span>;
        }
      }

      // Handle Bold (**...**)
      const boldParts = part.split(/(\*\*[^\*]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
          return (
            <strong key={`b-${pIdx}-${bIdx}`} className="font-bold text-teal-900 dark:text-teal-200">
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        return bPart;
      });
    });
  };

  return (
    <div className={`educational-content text-slate-800 dark:text-slate-100 ${className}`} dir="rtl">
      {renderFormattedContent(content)}
    </div>
  );
};
