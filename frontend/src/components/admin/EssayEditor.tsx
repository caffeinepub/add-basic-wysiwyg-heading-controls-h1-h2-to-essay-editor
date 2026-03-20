import { useState, useEffect, useRef, useCallback } from 'react';
import { useCreateEssay, useUpdateEssay } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { X, Download, Bold, Italic, Link as LinkIcon, Heading1, Heading2 } from 'lucide-react';
import type { Essay, RichText, ExternalBlob, RichTextSpan } from '../../backend';
import { ExternalBlob as ExternalBlobClass, HeadingLevel } from '../../backend';
import { downloadMarkdown } from '../../lib/markdownExport';

interface EssayEditorProps {
  essay: Essay | null;
  onClose: () => void;
}

interface FormattingRange {
  start: number;
  end: number;
}

interface LinkRange {
  start: number;
  end: number;
  url: string;
}

export default function EssayEditor({ essay, onClose }: EssayEditorProps) {
  const createEssay = useCreateEssay();
  const updateEssay = useUpdateEssay();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [heroImage, setHeroImage] = useState<ExternalBlob | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPublished, setIsPublished] = useState(false);

  // Track formatting state for selected text
  const [boldRanges, setBoldRanges] = useState<FormattingRange[]>([]);
  const [italicRanges, setItalicRanges] = useState<FormattingRange[]>([]);
  const [linkRanges, setLinkRanges] = useState<LinkRange[]>([]);

  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [pendingLinkRange, setPendingLinkRange] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (essay) {
      setTitle(essay.title);
      setSubtitle(essay.subtitle);
      
      // Convert RichText blocks with spans back to plain text with markers
      const { text, bold, italic, links } = richTextToPlainText(essay.body);
      setBody(text);
      setBoldRanges(bold.map(([start, end]) => ({ start, end })));
      setItalicRanges(italic.map(([start, end]) => ({ start, end })));
      setLinkRanges(links);
      
      setTags(essay.tags.join(', '));
      const date = new Date(Number(essay.publishDate) / 1_000_000);
      setPublishDate(date.toISOString().split('T')[0]);
      setIsPublished(essay.isPublished);
      if (essay.heroImage) {
        setHeroImage(essay.heroImage);
        setHeroImagePreview(essay.heroImage.getDirectURL());
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      setPublishDate(today);
      setIsPublished(false);
    }
  }, [essay]);

  // Convert RichText blocks to plain text while preserving formatting markers
  const richTextToPlainText = (blocks: RichText[]): {
    text: string;
    bold: Array<[number, number]>;
    italic: Array<[number, number]>;
    links: LinkRange[];
  } => {
    let text = '';
    const bold: Array<[number, number]> = [];
    const italic: Array<[number, number]> = [];
    const links: LinkRange[] = [];
    let offset = 0;

    blocks.forEach((block, blockIndex) => {
      if (blockIndex > 0) {
        text += '\n\n';
        offset += 2;
      }

      if (block.__kind__ === 'paragraph') {
        block.paragraph.content.forEach((span) => {
          const start = offset;
          const end = offset + span.text.length;
          text += span.text;
          if (span.isBold) bold.push([start, end]);
          if (span.isItalic) italic.push([start, end]);
          if (span.link) links.push({ start, end, url: span.link });
          offset += span.text.length;
        });
      } else if (block.__kind__ === 'heading') {
        // Use # for H1 and ## for H2
        const marker = block.heading.level === HeadingLevel.h1 ? '# ' : '## ';
        text += marker;
        offset += marker.length;
        block.heading.content.forEach((span) => {
          const start = offset;
          const end = offset + span.text.length;
          text += span.text;
          if (span.isBold) bold.push([start, end]);
          if (span.isItalic) italic.push([start, end]);
          if (span.link) links.push({ start, end, url: span.link });
          offset += span.text.length;
        });
      }
    });

    return { text, bold, italic, links };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlobClass.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });
      
      setHeroImage(blob);
      setHeroImagePreview(URL.createObjectURL(file));
      setUploadProgress(0);
    };
    reader.readAsArrayBuffer(file);
  };

  // Merge overlapping or adjacent ranges
  const mergeRanges = (ranges: FormattingRange[]): FormattingRange[] => {
    if (ranges.length === 0) return [];
    
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: FormattingRange[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      
      if (current.start <= last.end) {
        // Overlapping or adjacent, merge them
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  };

  // Check if a range is fully formatted
  const isRangeFormatted = (start: number, end: number, ranges: FormattingRange[]): boolean => {
    for (const range of ranges) {
      if (range.start <= start && range.end >= end) {
        return true;
      }
    }
    return false;
  };

  // Apply formatting to selected text
  const applyFormatting = useCallback((type: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) return; // No selection

    const ranges = type === 'bold' ? boldRanges : italicRanges;
    const setRanges = type === 'bold' ? setBoldRanges : setItalicRanges;

    // Check if selection is already fully formatted
    const isFormatted = isRangeFormatted(start, end, ranges);

    if (isFormatted) {
      // Remove formatting: split or remove ranges that overlap with selection
      const newRanges: FormattingRange[] = [];
      
      for (const range of ranges) {
        if (range.end <= start || range.start >= end) {
          // No overlap, keep as is
          newRanges.push(range);
        } else if (range.start < start && range.end > end) {
          // Selection is inside range, split it
          newRanges.push({ start: range.start, end: start });
          newRanges.push({ start: end, end: range.end });
        } else if (range.start < start && range.end <= end) {
          // Partial overlap at start
          newRanges.push({ start: range.start, end: start });
        } else if (range.start >= start && range.end > end) {
          // Partial overlap at end
          newRanges.push({ start: end, end: range.end });
        }
        // If range is fully inside selection, don't add it (remove it)
      }
      
      setRanges(newRanges);
    } else {
      // Add formatting
      const newRanges = mergeRanges([...ranges, { start, end }]);
      setRanges(newRanges);
    }

    // Restore selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    }, 0);
  }, [boldRanges, italicRanges]);

  // Get the current block (paragraph separated by blank lines)
  const getCurrentBlock = (cursorPos: number): { start: number; end: number; text: string } => {
    const lines = body.split('\n');
    let currentPos = 0;
    let blockStart = 0;
    let blockEnd = 0;
    let inBlock = false;
    let blockText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPos;
      const lineEnd = currentPos + line.length;

      if (cursorPos >= lineStart && cursorPos <= lineEnd + 1) {
        // Cursor is in this line
        if (!inBlock) {
          blockStart = lineStart;
          inBlock = true;
        }
        blockText = line;
        blockEnd = lineEnd;
        
        // Check if next line is blank (end of block)
        if (i + 1 < lines.length && lines[i + 1] === '') {
          break;
        }
        // Check if this is the last line
        if (i === lines.length - 1) {
          break;
        }
      } else if (inBlock && line === '') {
        // End of block
        break;
      }

      currentPos = lineEnd + 1; // +1 for newline
    }

    return { start: blockStart, end: blockEnd, text: blockText };
  };

  // Apply heading level to current block
  const applyHeading = useCallback((level: 'h1' | 'h2' | null) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const block = getCurrentBlock(cursorPos);
    
    // Check current heading level
    const isH1 = block.text.startsWith('# ');
    const isH2 = block.text.startsWith('## ');
    const currentLevel = isH1 ? 'h1' : isH2 ? 'h2' : null;

    // If already at this level, toggle off (make paragraph)
    if (currentLevel === level) {
      level = null;
    }

    let newText = body;
    let newBlockText = block.text;
    let markerLengthDiff = 0;

    // Remove existing marker
    if (isH1) {
      newBlockText = newBlockText.slice(2);
      markerLengthDiff = -2;
    } else if (isH2) {
      newBlockText = newBlockText.slice(3);
      markerLengthDiff = -3;
    }

    // Add new marker
    if (level === 'h1') {
      newBlockText = '# ' + newBlockText;
      markerLengthDiff += 2;
    } else if (level === 'h2') {
      newBlockText = '## ' + newBlockText;
      markerLengthDiff += 3;
    }

    // Replace block in text
    newText = body.substring(0, block.start) + newBlockText + body.substring(block.end);

    // Adjust formatting ranges
    const adjustRanges = (ranges: FormattingRange[]): FormattingRange[] => {
      return ranges
        .map(range => {
          if (range.start >= block.end) {
            // Range is after block, shift it
            return { start: range.start + markerLengthDiff, end: range.end + markerLengthDiff };
          } else if (range.end <= block.start) {
            // Range is before block, keep as is
            return range;
          } else if (range.start >= block.start && range.end <= block.end) {
            // Range is inside block, shift it
            return { start: range.start + markerLengthDiff, end: range.end + markerLengthDiff };
          } else if (range.start < block.start && range.end > block.end) {
            // Range spans across block
            return { start: range.start, end: range.end + markerLengthDiff };
          } else if (range.start < block.start && range.end <= block.end) {
            // Range starts before block and ends inside
            return { start: range.start, end: range.end + markerLengthDiff };
          } else {
            // Range starts inside block and ends after
            return { start: range.start + markerLengthDiff, end: range.end + markerLengthDiff };
          }
        })
        .filter(r => r.start < r.end);
    };

    const adjustLinkRanges = (ranges: LinkRange[]): LinkRange[] => {
      return ranges
        .map(range => {
          if (range.start >= block.end) {
            return { ...range, start: range.start + markerLengthDiff, end: range.end + markerLengthDiff };
          } else if (range.end <= block.start) {
            return range;
          } else if (range.start >= block.start && range.end <= block.end) {
            return { ...range, start: range.start + markerLengthDiff, end: range.end + markerLengthDiff };
          } else if (range.start < block.start && range.end > block.end) {
            return { ...range, end: range.end + markerLengthDiff };
          } else if (range.start < block.start && range.end <= block.end) {
            return { ...range, end: range.end + markerLengthDiff };
          } else {
            return { ...range, start: range.start + markerLengthDiff, end: range.end + markerLengthDiff };
          }
        })
        .filter(r => r.start < r.end);
    };

    setBoldRanges(adjustRanges(boldRanges));
    setItalicRanges(adjustRanges(italicRanges));
    setLinkRanges(adjustLinkRanges(linkRanges));
    setBody(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = cursorPos + markerLengthDiff;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [body, boldRanges, italicRanges, linkRanges]);

  // Handle link button click
  const handleLinkClick = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) return; // No selection

    // Check if selection already has a link
    const existingLink = linkRanges.find(
      (link) => link.start <= start && link.end >= end
    );

    if (existingLink) {
      // Remove link
      const newLinks = linkRanges.filter(
        (link) => !(link.start === existingLink.start && link.end === existingLink.end)
      );
      setLinkRanges(newLinks);
      
      // Restore selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end);
      }, 0);
    } else {
      // Show dialog to add link
      setPendingLinkRange({ start, end });
      setLinkUrl('');
      setShowLinkDialog(true);
    }
  }, [linkRanges]);

  // Handle link dialog submit
  const handleLinkSubmit = () => {
    if (!pendingLinkRange || !linkUrl.trim()) return;

    const newLink: LinkRange = {
      start: pendingLinkRange.start,
      end: pendingLinkRange.end,
      url: linkUrl.trim(),
    };

    setLinkRanges([...linkRanges, newLink]);
    setShowLinkDialog(false);
    setLinkUrl('');
    setPendingLinkRange(null);

    // Restore selection
    const textarea = textareaRef.current;
    if (textarea) {
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(pendingLinkRange.start, pendingLinkRange.end);
      }, 0);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey && e.key === 'b') {
      e.preventDefault();
      applyFormatting('bold');
    } else if (modKey && e.key === 'i') {
      e.preventDefault();
      applyFormatting('italic');
    }
  }, [applyFormatting]);

  // Handle text changes - adjust formatting ranges
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const oldText = body;
    
    // Simple heuristic: if text length changed, adjust ranges
    if (newText.length !== oldText.length) {
      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      const lengthDiff = newText.length - oldText.length;
      
      // Adjust ranges that come after the cursor
      const adjustRanges = (ranges: FormattingRange[]): FormattingRange[] => {
        return ranges
          .map(range => {
            if (range.start >= cursorPos) {
              // Range is after cursor, shift it
              return { start: range.start + lengthDiff, end: range.end + lengthDiff };
            } else if (range.end <= cursorPos) {
              // Range is before cursor, keep as is
              return range;
            } else {
              // Cursor is inside range
              if (lengthDiff > 0) {
                // Text added, extend range
                return { start: range.start, end: range.end + lengthDiff };
              } else {
                // Text removed, shrink range
                const newEnd = Math.max(range.start, range.end + lengthDiff);
                if (newEnd <= range.start) return null; // Range collapsed
                return { start: range.start, end: newEnd };
              }
            }
          })
          .filter((r): r is FormattingRange => r !== null && r.start < r.end);
      };

      const adjustLinkRanges = (ranges: LinkRange[]): LinkRange[] => {
        return ranges
          .map(range => {
            if (range.start >= cursorPos) {
              return { ...range, start: range.start + lengthDiff, end: range.end + lengthDiff };
            } else if (range.end <= cursorPos) {
              return range;
            } else {
              if (lengthDiff > 0) {
                return { ...range, end: range.end + lengthDiff };
              } else {
                const newEnd = Math.max(range.start, range.end + lengthDiff);
                if (newEnd <= range.start) return null;
                return { ...range, end: newEnd };
              }
            }
          })
          .filter((r): r is LinkRange => r !== null && r.start < r.end);
      };
      
      setBoldRanges(adjustRanges(boldRanges));
      setItalicRanges(adjustRanges(italicRanges));
      setLinkRanges(adjustLinkRanges(linkRanges));
    }
    
    setBody(newText);
  };

  // Convert plain text with markers back to RichText blocks
  const plainTextToRichText = (text: string): RichText[] => {
    const blocks = text.split('\n\n');
    let offset = 0;
    
    return blocks.map((blockText, index) => {
      if (index > 0) offset += 2; // Account for \n\n
      
      const isH1 = blockText.startsWith('# ');
      const isH2 = blockText.startsWith('## ');
      const isHeading = isH1 || isH2;
      const headingLevel = isH1 ? HeadingLevel.h1 : HeadingLevel.h2;
      const markerLength = isH1 ? 2 : isH2 ? 3 : 0;
      const content = isHeading ? blockText.slice(markerLength) : blockText;
      const contentOffset = offset + markerLength;
      
      // Split content into spans based on formatting
      const spans = createSpansFromText(content, contentOffset);
      
      offset += blockText.length;
      
      if (isHeading) {
        return { 
          __kind__: 'heading' as const, 
          heading: { content: spans, level: headingLevel } 
        };
      }
      return { __kind__: 'paragraph' as const, paragraph: { content: spans } };
    });
  };

  // Create spans from text with formatting markers
  const createSpansFromText = (text: string, offset: number): RichTextSpan[] => {
    if (text.length === 0) {
      return [{ text: '', isBold: false, isItalic: false, link: undefined }];
    }

    // Create a list of all formatting boundaries
    const boundaries = new Set<number>([0, text.length]);
    
    boldRanges.forEach(({ start, end }) => {
      if (start >= offset && start < offset + text.length) boundaries.add(start - offset);
      if (end > offset && end <= offset + text.length) boundaries.add(end - offset);
    });
    
    italicRanges.forEach(({ start, end }) => {
      if (start >= offset && start < offset + text.length) boundaries.add(start - offset);
      if (end > offset && end <= offset + text.length) boundaries.add(end - offset);
    });

    linkRanges.forEach(({ start, end }) => {
      if (start >= offset && start < offset + text.length) boundaries.add(start - offset);
      if (end > offset && end <= offset + text.length) boundaries.add(end - offset);
    });

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
    const spans: RichTextSpan[] = [];

    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const start = sortedBoundaries[i];
      const end = sortedBoundaries[i + 1];
      const spanText = text.slice(start, end);
      
      if (spanText.length === 0) continue;

      const absoluteStart = offset + start;
      const absoluteEnd = offset + end;

      const isBold = boldRanges.some(
        ({ start: mStart, end: mEnd }) => mStart <= absoluteStart && mEnd >= absoluteEnd
      );
      const isItalic = italicRanges.some(
        ({ start: mStart, end: mEnd }) => mStart <= absoluteStart && mEnd >= absoluteEnd
      );
      const linkRange = linkRanges.find(
        ({ start: mStart, end: mEnd }) => mStart <= absoluteStart && mEnd >= absoluteEnd
      );

      spans.push({ 
        text: spanText, 
        isBold, 
        isItalic,
        link: linkRange?.url 
      });
    }

    return spans.length > 0 ? spans : [{ text, isBold: false, isItalic: false, link: undefined }];
  };

  const handleSave = async (publishStatus: boolean) => {
    const bodyBlocks = plainTextToRichText(body);

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const date = new Date(publishDate);
    const timestamp = BigInt(date.getTime() * 1_000_000);

    if (essay) {
      await updateEssay.mutateAsync({
        id: essay.id,
        title,
        subtitle,
        body: bodyBlocks,
        heroImage,
        tags: tagArray,
        publishDate: timestamp,
        isPublished: publishStatus,
      });
    } else {
      await createEssay.mutateAsync({
        title,
        subtitle,
        body: bodyBlocks,
        heroImage,
        tags: tagArray,
        publishDate: timestamp,
        isPublished: publishStatus,
      });
    }

    onClose();
  };

  const handleExportMarkdown = () => {
    const bodyBlocks = plainTextToRichText(body);
    downloadMarkdown(title || 'Untitled', subtitle, bodyBlocks);
  };

  // Generate preview with formatting
  const getFormattedPreview = (): React.ReactNode => {
    if (!body) return null;

    const parts: Array<{ text: string; isBold: boolean; isItalic: boolean; link?: string }> = [];

    // Collect all boundaries
    const boundaries = new Set<number>([0, body.length]);
    boldRanges.forEach(({ start, end }) => {
      boundaries.add(start);
      boundaries.add(end);
    });
    italicRanges.forEach(({ start, end }) => {
      boundaries.add(start);
      boundaries.add(end);
    });
    linkRanges.forEach(({ start, end }) => {
      boundaries.add(start);
      boundaries.add(end);
    });

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
      const start = sortedBoundaries[i];
      const end = sortedBoundaries[i + 1];
      const text = body.slice(start, end);

      if (text.length === 0) continue;

      const isBold = boldRanges.some(r => r.start <= start && r.end >= end);
      const isItalic = italicRanges.some(r => r.start <= start && r.end >= end);
      const linkRange = linkRanges.find(r => r.start <= start && r.end >= end);

      parts.push({ text, isBold, isItalic, link: linkRange?.url });
    }

    return (
      <div className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          let content: React.ReactNode = part.text;
          
          if (part.isBold && part.isItalic) {
            content = <strong key={i}><em>{part.text}</em></strong>;
          } else if (part.isBold) {
            content = <strong key={i}>{part.text}</strong>;
          } else if (part.isItalic) {
            content = <em key={i}>{part.text}</em>;
          } else {
            content = <span key={i}>{part.text}</span>;
          }

          if (part.link) {
            return (
              <a 
                key={i}
                href={part.link}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            );
          }

          return content;
        })}
      </div>
    );
  };

  const isSaving = createEssay.isPending || updateEssay.isPending;

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{essay ? 'Edit Essay' : 'Create New Essay'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Essay title"
            />
          </div>

          <div>
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Essay subtitle"
            />
          </div>

          <div>
            <Label htmlFor="heroImage">Hero Image</Label>
            <Input
              id="heroImage"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{uploadProgress}% uploaded</p>
              </div>
            )}
            {heroImagePreview && (
              <div className="mt-2 relative">
                <img src={heroImagePreview} alt="Hero preview" className="w-full max-h-64 object-cover rounded" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setHeroImage(null);
                    setHeroImagePreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="body">Body</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyHeading('h1')}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyHeading('h2')}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('bold')}
                  title="Bold (Ctrl/Cmd+B)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('italic')}
                  title="Italic (Ctrl/Cmd+I)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLinkClick}
                  title="Add/Remove Link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              id="body"
              value={body}
              onChange={handleBodyChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your essay here... Use # for H1 headings, ## for H2 headings. Separate paragraphs with blank lines."
              className="min-h-[400px] font-mono"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Tip: Use blank lines to separate paragraphs. Start a line with # for H1 or ## for H2 headings.
            </p>
          </div>

          {body && (
            <div>
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/30 prose prose-neutral dark:prose-invert max-w-none">
                {getFormattedPreview()}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="technology, philosophy, design"
            />
            {tags && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.split(',').map((tag, i) => {
                  const trimmed = tag.trim();
                  return trimmed ? (
                    <Badge key={i} variant="secondary">
                      {trimmed}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="publishDate">Publish Date</Label>
            <Input
              id="publishDate"
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleExportMarkdown}
                disabled={!body}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Markdown
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={() => handleSave(false)}
                disabled={isSaving || !title}
                variant="secondary"
              >
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving || !title}
              >
                {isSaving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkUrl">URL</Label>
              <Input
                id="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLinkSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLinkSubmit} disabled={!linkUrl.trim()}>
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
