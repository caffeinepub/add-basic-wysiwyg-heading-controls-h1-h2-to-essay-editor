import type { RichText, RichTextSpan } from '../backend';

/**
 * Converts an array of RichTextSpans to Markdown with inline formatting
 */
function spansToMarkdown(spans: RichTextSpan[]): string {
  return spans
    .map((span) => {
      let text = span.text;
      
      // Apply bold and italic formatting
      if (span.isBold && span.isItalic) {
        text = `***${text}***`;
      } else if (span.isBold) {
        text = `**${text}**`;
      } else if (span.isItalic) {
        text = `*${text}*`;
      }
      
      // Wrap in link if present
      if (span.link) {
        text = `[${text}](${span.link})`;
      }
      
      return text;
    })
    .join('');
}

/**
 * Converts RichText blocks to Markdown format
 */
export function richTextToMarkdown(blocks: RichText[]): string {
  return blocks
    .map((block) => {
      if (block.__kind__ === 'paragraph') {
        return spansToMarkdown(block.paragraph.content);
      }
      if (block.__kind__ === 'heading') {
        // Default to h2 for backward compatibility with old data
        const level = block.heading.level || 'h2';
        const marker = level === 'h1' ? '# ' : '## ';
        return `${marker}${spansToMarkdown(block.heading.content)}`;
      }
      if (block.__kind__ === 'quote') {
        return `> ${spansToMarkdown(block.quote.content)}`;
      }
      if (block.__kind__ === 'code') {
        return `\`\`\`\n${spansToMarkdown(block.code.content)}\n\`\`\``;
      }
      if (block.__kind__ === 'unorderedList' || block.__kind__ === 'list') {
        const items = block.__kind__ === 'unorderedList' ? block.unorderedList : block.list;
        return items.map((item) => `- ${spansToMarkdown(item.content)}`).join('\n');
      }
      if (block.__kind__ === 'orderedList') {
        return block.orderedList.map((item, i) => `${i + 1}. ${spansToMarkdown(item.content)}`).join('\n');
      }
      if (block.__kind__ === 'image') {
        return `![${block.image.alt}](${block.image.url})`;
      }
      return '';
    })
    .join('\n\n');
}

/**
 * Generates a Markdown file and triggers download
 */
export function downloadMarkdown(title: string, subtitle: string, body: RichText[]): void {
  const markdownContent = [
    `# ${title}`,
    '',
    subtitle ? `*${subtitle}*` : '',
    subtitle ? '' : null,
    richTextToMarkdown(body),
  ]
    .filter((line) => line !== null)
    .join('\n');

  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Sanitize filename: replace spaces with hyphens, remove special characters
  const sanitizedTitle = title
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .substring(0, 100); // Limit length
  
  link.download = `${sanitizedTitle || 'essay'}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
