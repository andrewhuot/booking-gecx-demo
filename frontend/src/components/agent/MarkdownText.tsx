import type { ReactNode } from 'react';

interface MarkdownTextProps {
  text: string;
}

interface TextBlock {
  type: 'paragraph';
  text: string;
}

interface ListBlock {
  type: 'list';
  items: string[];
}

type Block = TextBlock | ListBlock;

const boldPattern = /(\*\*[^*]+\*\*)/g;

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(boldPattern).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: 'list', items: list });
    list = [];
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function MarkdownText({ text }: MarkdownTextProps) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'list') {
          return (
            <ul
              key={`list-${blockIndex}`}
              className="list-disc space-y-1 pl-4 marker:text-bc-blue"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`}>{renderInlineMarkdown(block.text)}</p>
        );
      })}
    </div>
  );
}
