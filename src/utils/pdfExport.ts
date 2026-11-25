import { jsPDF } from 'jspdf';
import type { FlashcardItem } from '../components/VocabularyFlashcards.tsx';
import type { LanguageChoice, Lesson } from '../types.ts';

function sanitizePdfText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u203F/g, ' ')
    .replace(/\u02C8/g, "'")
    .replace(/\u02D0/g, ':')
    .replace(/\u0259/g, 'e')
    .replace(/\u0283/g, 'sh')
    .replace(/\u0292/g, 'zh')
    .replace(/\u028A/g, 'u')
    .replace(/\u026A/g, 'i')
    .replace(/\u025B/g, 'eh')
    .replace(/\u0254/g, 'aw')
    .replace(/\u0251/g, 'ah')
    .replace(/\u028C/g, 'uh')
    .replace(/\u0261/g, 'g')
    .replace(/\u0281/g, 'r')
    .replace(/\u0265/g, 'w')
    .replace(/\u014B/g, 'ng')
    .replace(/\u0303/g, '~')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

interface PdfCursor {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

function createDocument(title: string, subtitle: string): PdfCursor {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Header band
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LINGUALEARN PHYSICAL STUDY GUIDE', margin, 10);

  doc.setFontSize(15);
  const wrappedTitle = doc.splitTextToSize(sanitizePdfText(title), contentWidth);
  doc.text(wrappedTitle[0] || 'Study Guide', margin, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(219, 234, 254);
  doc.text(sanitizePdfText(subtitle), margin, 25);

  return {
    doc,
    y: 38,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
  };
}

function ensureSpace(ctx: PdfCursor, neededMm: number): void {
  if (ctx.y + neededMm > ctx.pageHeight - 18) {
    ctx.doc.addPage();
    ctx.y = 18;
  }
}

function addSectionHeading(ctx: PdfCursor, heading: string): void {
  ensureSpace(ctx, 14);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(11);
  ctx.doc.setTextColor(29, 78, 216);
  ctx.doc.text(sanitizePdfText(heading), ctx.margin, ctx.y);
  ctx.y += 2;
  ctx.doc.setDrawColor(203, 213, 225);
  ctx.doc.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  ctx.y += 6;
}

function addParagraph(
  ctx: PdfCursor,
  text: string,
  options?: { bold?: boolean; fontSize?: number; color?: [number, number, number]; gapAfter?: number }
): void {
  const fontSize = options?.fontSize ?? 10;
  const lineHeight = fontSize * 0.45 + 1.2;
  const color = options?.color ?? [30, 41, 59];

  ctx.doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(color[0], color[1], color[2]);

  const lines = ctx.doc.splitTextToSize(sanitizePdfText(text), ctx.contentWidth) as string[];
  for (const line of lines) {
    ensureSpace(ctx, lineHeight + 2);
    ctx.doc.text(line, ctx.margin, ctx.y);
    ctx.y += lineHeight;
  }
  ctx.y += options?.gapAfter ?? 3;
}

function finalizeFooters(ctx: PdfCursor): void {
  const pageCount = ctx.doc.getNumberOfPages();
  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  for (let i = 1; i <= pageCount; i++) {
    ctx.doc.setPage(i);
    ctx.doc.setDrawColor(226, 232, 240);
    ctx.doc.line(ctx.margin, ctx.pageHeight - 13, ctx.pageWidth - ctx.margin, ctx.pageHeight - 13);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(100, 116, 139);
    ctx.doc.text(
      `LinguaLearn Academy · Exported ${dateLabel}`,
      ctx.margin,
      ctx.pageHeight - 8
    );
    ctx.doc.text(
      `Page ${i} of ${pageCount}`,
      ctx.pageWidth - ctx.margin,
      ctx.pageHeight - 8,
      { align: 'right' }
    );
  }
}

export function exportIndividualLessonPdf(lesson: Lesson): void {
  const metaSubtitle = [
    lesson.language.toUpperCase(),
    lesson.skillType.toUpperCase(),
    lesson.level.toUpperCase(),
    lesson.courseTitle || '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const ctx = createDocument(lesson.title, metaSubtitle);

  if (lesson.summary) {
    addSectionHeading(ctx, 'Lesson Summary');
    addParagraph(ctx, lesson.summary, { color: [51, 65, 85], gapAfter: 5 });
  }

  addSectionHeading(ctx, 'Core Instruction & Study Notes');
  addParagraph(ctx, lesson.content, { gapAfter: 5 });

  if (lesson.pdfContent) {
    addSectionHeading(ctx, lesson.pdfTitle ? `Study Sheet: ${lesson.pdfTitle}` : 'Practice Notes');
    addParagraph(ctx, lesson.pdfContent, { gapAfter: 5 });
  }

  if (Array.isArray(lesson.examples) && lesson.examples.length > 0) {
    addSectionHeading(ctx, 'Key Examples & Pronunciation');
    for (let i = 0; i < lesson.examples.length; i++) {
      const ex = lesson.examples[i];
      ensureSpace(ctx, 18);
      addParagraph(
        ctx,
        `${i + 1}. ${ex.phrase}${ex.phonetic ? `   [${ex.phonetic}]` : ''}`,
        { bold: true, fontSize: 10, color: [15, 23, 42], gapAfter: 1 }
      );
      addParagraph(ctx, `   Meaning / Translation: ${ex.translation}`, {
        fontSize: 9.5,
        color: [71, 85, 105],
        gapAfter: 3,
      });
    }
  }

  finalizeFooters(ctx);
  const filename = `LinguaLearn_${slugify(lesson.title) || 'lesson'}.pdf`;
  ctx.doc.save(filename);
}

export interface GrammarReferenceRow {
  structure: string;
  usage: string;
  example: string;
}

export interface GrammarDrillItem {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

export function exportSkillModulePdf(options: {
  language: LanguageChoice;
  skill: 'vocabulary' | 'grammar';
  levelLabel: string;
  vocabCards?: FlashcardItem[];
  grammarRows?: GrammarReferenceRow[];
  grammarDrills?: GrammarDrillItem[];
  lessons: Lesson[];
}): void {
  const { language, skill, levelLabel, vocabCards, grammarRows, grammarDrills, lessons } = options;
  const langLabel = language === 'french' ? 'French' : 'English';
  const skillLabel = skill === 'vocabulary' ? 'Vocabulary & Collocations' : 'Grammar & Structure';

  const ctx = createDocument(
    `${langLabel} ${skillLabel} Study Guide`,
    `${langLabel.toUpperCase()}  ·  ${skill.toUpperCase()}  ·  Filter: ${levelLabel}`
  );

  if (skill === 'vocabulary' && vocabCards && vocabCards.length > 0) {
    addSectionHeading(ctx, `${langLabel} Core Vocabulary Flashcard Lexicon`);
    for (let i = 0; i < vocabCards.length; i++) {
      const card = vocabCards[i];
      ensureSpace(ctx, 22);
      const headerLine = `${i + 1}. ${card.term}${card.category ? ` (${card.category})` : ''}`;
      addParagraph(ctx, headerLine, {
        bold: true,
        fontSize: 10.5,
        color: [15, 23, 42],
        gapAfter: 1,
      });
      if (card.phonetic) {
        addParagraph(ctx, `   Pronunciation: ${card.phonetic}`, {
          fontSize: 9,
          color: [29, 78, 216],
          gapAfter: 1,
        });
      }
      addParagraph(ctx, `   Definition: ${card.meaning}`, {
        fontSize: 9.5,
        color: [51, 65, 85],
        gapAfter: 1,
      });
      addParagraph(ctx, `   Example: "${card.example}"`, {
        fontSize: 9.5,
        color: [71, 85, 105],
        gapAfter: 4,
      });
    }
  }

  if (skill === 'grammar' && grammarRows && grammarRows.length > 0) {
    addSectionHeading(ctx, `${langLabel} Core Tense & Structure Reference`);
    for (const row of grammarRows) {
      ensureSpace(ctx, 18);
      addParagraph(ctx, `${row.structure} — ${row.usage}`, {
        bold: true,
        fontSize: 10,
        color: [15, 23, 42],
        gapAfter: 1,
      });
      addParagraph(ctx, `   Example: ${row.example}`, {
        fontSize: 9.5,
        color: [71, 85, 105],
        gapAfter: 3,
      });
    }
  }

  if (skill === 'grammar' && grammarDrills && grammarDrills.length > 0) {
    addSectionHeading(ctx, 'Self-Check Practice Exercises');
    for (let i = 0; i < grammarDrills.length; i++) {
      const q = grammarDrills[i];
      ensureSpace(ctx, 22);
      addParagraph(ctx, `${i + 1}. ${q.prompt}`, {
        bold: true,
        fontSize: 10,
        color: [15, 23, 42],
        gapAfter: 1,
      });
      addParagraph(
        ctx,
        `   Options: ${q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('   ')}`,
        { fontSize: 9.5, color: [51, 65, 85], gapAfter: 3 }
      );
    }

    addSectionHeading(ctx, 'Answer Key & Explanations');
    for (let i = 0; i < grammarDrills.length; i++) {
      const q = grammarDrills[i];
      ensureSpace(ctx, 15);
      addParagraph(ctx, `${i + 1}. Answer: ${q.answer} — ${q.explanation}`, {
        fontSize: 9.5,
        color: [51, 65, 85],
        gapAfter: 3,
      });
    }
  }

  if (lessons.length > 0) {
    addSectionHeading(ctx, `${langLabel} ${skillLabel} Curriculum Lessons (${lessons.length})`);
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      ensureSpace(ctx, 26);
      addParagraph(
        ctx,
        `${i + 1}. ${lesson.title} (${lesson.level.toUpperCase()}${lesson.courseTitle ? ` · ${lesson.courseTitle}` : ''})`,
        { bold: true, fontSize: 10.5, color: [15, 23, 42], gapAfter: 1.5 }
      );
      addParagraph(ctx, lesson.content, { fontSize: 9.5, color: [51, 65, 85], gapAfter: 2 });
      if (lesson.pdfContent) {
        addParagraph(ctx, `Study Notes: ${lesson.pdfContent}`, {
          fontSize: 9,
          color: [71, 85, 105],
          gapAfter: 2,
        });
      }
      if (Array.isArray(lesson.examples) && lesson.examples.length > 0) {
        for (const ex of lesson.examples) {
          addParagraph(ctx, `   • ${ex.phrase} — ${ex.translation}`, {
            fontSize: 9,
            color: [71, 85, 105],
            gapAfter: 1,
          });
        }
      }
      ctx.y += 2;
    }
  }

  finalizeFooters(ctx);
  ctx.doc.save(`LinguaLearn_${language}_${skill}_Study_Guide.pdf`);
}
