import type { RichText, RichTextSpan } from '../backend';

interface RichTextRendererProps {
  content: RichText[];
  className?: string;
}

// Helper to render an array of RichTextSpans with formatting
function renderSpans(spans: RichTextSpan[]) {
  return spans.map((span, i) => {
    let content: React.ReactNode = span.text;
    
    // Apply bold and italic formatting
    if (span.isBold && span.isItalic) {
      content = <strong key={i}><em>{span.text}</em></strong>;
    } else if (span.isBold) {
      content = <strong key={i}>{span.text}</strong>;
    } else if (span.isItalic) {
      content = <em key={i}>{span.text}</em>;
    } else {
      content = <span key={i}>{span.text}</span>;
    }
    
    // Wrap in link if present
    if (span.link) {
      return (
        <a 
          key={i}
          href={span.link}
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }
    
    return content;
  });
}

export default function RichTextRenderer({ content, className = '' }: RichTextRendererProps) {
  return (
    <div className={`prose prose-neutral dark:prose-invert max-w-none ${className}`}>
      {content.map((block, index) => {
        if (block.__kind__ === 'paragraph') {
          return (
            <p key={index} className="mb-4 leading-relaxed">
              {renderSpans(block.paragraph.content)}
            </p>
          );
        }
        if (block.__kind__ === 'heading') {
          // Default to h2 for backward compatibility with old data
          const level = block.heading.level || 'h2';
          
          if (level === 'h1') {
            return (
              <h1 key={index} className="text-4xl font-bold mb-6 mt-10">
                {renderSpans(block.heading.content)}
              </h1>
            );
          } else {
            return (
              <h2 key={index} className="text-2xl font-bold mb-4 mt-8">
                {renderSpans(block.heading.content)}
              </h2>
            );
          }
        }
        if (block.__kind__ === 'quote') {
          return (
            <blockquote key={index} className="border-l-4 border-border pl-4 italic my-6">
              {renderSpans(block.quote.content)}
            </blockquote>
          );
        }
        if (block.__kind__ === 'code') {
          return (
            <pre key={index} className="bg-muted p-4 rounded-lg overflow-x-auto my-6">
              <code>{renderSpans(block.code.content)}</code>
            </pre>
          );
        }
        if (block.__kind__ === 'unorderedList' || block.__kind__ === 'list') {
          const items = block.__kind__ === 'unorderedList' ? block.unorderedList : block.list;
          return (
            <ul key={index} className="list-disc list-inside mb-4 space-y-2">
              {items.map((item, i) => (
                <li key={i}>{renderSpans(item.content)}</li>
              ))}
            </ul>
          );
        }
        if (block.__kind__ === 'orderedList') {
          return (
            <ol key={index} className="list-decimal list-inside mb-4 space-y-2">
              {block.orderedList.map((item, i) => (
                <li key={i}>{renderSpans(item.content)}</li>
              ))}
            </ol>
          );
        }
        if (block.__kind__ === 'image') {
          return (
            <figure key={index} className="my-8">
              <img src={block.image.url} alt={block.image.alt} className="w-full rounded-lg" />
              {block.image.alt && (
                <figcaption className="text-sm text-muted-foreground mt-2 text-center">
                  {block.image.alt}
                </figcaption>
              )}
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
