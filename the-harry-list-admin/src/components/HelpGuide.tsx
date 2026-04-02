import { useState, useEffect, useCallback } from 'react';
import { X, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';

export interface GuideSection {
  title: string;
  content: string;
  /** Optional: path to a screenshot image, e.g. "/screenshots/dashboard-overview.png" */
  screenshot?: string;
  /** Optional: alt text for the screenshot */
  screenshotAlt?: string;
}

interface HelpGuideProps {
  title: string;
  sections: GuideSection[];
}

/** Renders a lightweight subset of Markdown to JSX */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`list-${listKey}`} className="list-disc list-inside space-y-1 text-dark-300 text-sm ml-1">
          {listItems}
        </ul>
      );
      listItems = [];
      listKey++;
    }
  };

  lines.forEach((line, i) => {
    // Blank line
    if (line.trim() === '') {
      flushList();
      return;
    }

    // Bullet list item
    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(<li key={i}>{renderInline(bulletMatch[1])}</li>);
      return;
    }

    // Numbered list item
    const numberedMatch = line.match(/^\d+\.\s+(.*)/);
    if (numberedMatch) {
      listItems.push(<li key={i}>{renderInline(numberedMatch[1])}</li>);
      return;
    }

    flushList();

    // Heading
    if (line.startsWith('### ')) {
      nodes.push(<h4 key={i} className="text-sm font-semibold text-hubble-400 mt-4 mb-1">{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} className="text-base font-semibold text-white mt-4 mb-1">{line.slice(3)}</h3>);
    } else {
      // Normal paragraph
      nodes.push(<p key={i} className="text-sm text-dark-300 leading-relaxed">{renderInline(line)}</p>);
    }
  });

  flushList();
  return nodes;
}

/** Renders inline Markdown: **bold**, `code`, *italic* */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold**, `code`, *italic* — process in order of appearance
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={key++} className="text-white font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // `code`
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-dark-800 text-hubble-400 text-xs font-mono">
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      // *italic*
      parts.push(<em key={key++} className="text-dark-200 italic">{match[4]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function HelpGuide({ title, sections }: HelpGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [failedScreenshots, setFailedScreenshots] = useState<Set<string>>(new Set());

  const open = useCallback(() => {
    setCurrentSection(0);
    setIsOpen(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const section = sections[currentSection];
  const hasPrev = currentSection > 0;
  const hasNext = currentSection < sections.length - 1;

  return (
    <>
      {/* Help button */}
      <button
        onClick={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-dark-400 hover:text-hubble-400 hover:bg-hubble-500/10 transition-all"
        title={`Help: ${title}`}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Help</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-dark-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-hubble-500/20 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-hubble-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  {sections.length > 1 && (
                    <p className="text-xs text-dark-400">
                      Step {currentSection + 1} of {sections.length}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section navigation tabs (if multiple sections) */}
            {sections.length > 1 && (
              <div className="shrink-0 flex gap-1.5 px-6 py-3 overflow-x-auto border-b border-dark-800">
                {sections.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSection(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      i === currentSection
                        ? 'bg-hubble-500/20 text-hubble-400'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <h3 className="text-base font-semibold text-white">{section.title}</h3>

              {/* Screenshot or placeholder */}
              {section.screenshot && (
                <div className="rounded-xl border border-dark-700 overflow-hidden bg-dark-800/50">
                  {failedScreenshots.has(section.screenshot) ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <svg className="w-10 h-10 text-dark-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-dark-500">Screenshot: {section.screenshotAlt || section.title}</p>
                      <p className="text-xs text-dark-600 mt-1">Add image at: {section.screenshot}</p>
                    </div>
                  ) : (
                    <img
                      src={section.screenshot}
                      alt={section.screenshotAlt || section.title}
                      className="w-full h-auto"
                      onError={() => {
                        setFailedScreenshots(prev => new Set(prev).add(section.screenshot!));
                      }}
                    />
                  )}
                </div>
              )}

              {renderMarkdown(section.content)}
            </div>

            {/* Footer navigation */}
            {sections.length > 1 && (
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-dark-800">
                <button
                  onClick={() => setCurrentSection((p) => p - 1)}
                  disabled={!hasPrev}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasPrev
                      ? 'text-white hover:bg-dark-800'
                      : 'text-dark-600 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {/* Dots */}
                <div className="flex gap-1.5">
                  {sections.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSection(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentSection ? 'bg-hubble-400 w-4' : 'bg-dark-600 hover:bg-dark-500'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => hasNext ? setCurrentSection((p) => p + 1) : setIsOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasNext
                      ? 'bg-hubble-600 hover:bg-hubble-500 text-white'
                      : 'bg-dark-700 hover:bg-dark-600 text-white'
                  }`}
                >
                  {hasNext ? 'Next' : 'Done'}
                  {hasNext && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Single-section close */}
            {sections.length <= 1 && (
              <div className="shrink-0 flex justify-end px-6 py-4 border-t border-dark-800">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-700 hover:bg-dark-600 text-white transition-all"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
