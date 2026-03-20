import { useState, useEffect } from 'react';
import { useGetPageContent, useUpdatePageContent, useGetWritingPageContent, useUpdateWritingPageContent } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, X } from 'lucide-react';
import type { PageContent, WritingPageContent, RichText, RichTextSpan } from '../../backend';
import { HeadingLevel } from '../../backend';

const PAGE_IDS = ['home', 'about', 'writing', 'contact'];

export default function PageEditor() {
  const [selectedPage, setSelectedPage] = useState('home');
  const { data: pageContent, isLoading: pageLoading } = useGetPageContent(selectedPage);
  const { data: writingContent, isLoading: writingLoading } = useGetWritingPageContent();
  const updatePage = useUpdatePageContent();
  const updateWritingPage = useUpdateWritingPageContent();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<[string, string][]>([]);

  const isWritingPage = selectedPage === 'writing';
  const isLoading = isWritingPage ? writingLoading : pageLoading;

  // Convert RichText blocks to plain text
  const richTextToPlainText = (blocks: RichText[]): string => {
    return blocks
      .map((block) => {
        if (block.__kind__ === 'paragraph') {
          return block.paragraph.content.map(span => span.text).join('');
        }
        if (block.__kind__ === 'heading') {
          return `# ${block.heading.content.map(span => span.text).join('')}`;
        }
        return '';
      })
      .join('\n\n');
  };

  // Update form when page data loads
  useEffect(() => {
    if (isWritingPage && writingContent) {
      setTitle(writingContent.title);
      setSubtitle(writingContent.subtitle);
      setContent('');
      setLinks([]);
    } else if (!isWritingPage && pageContent) {
      setTitle(pageContent.title);
      setSubtitle(pageContent.subtitle);
      setContent(richTextToPlainText(pageContent.content));
      setLinks(pageContent.links);
    }
  }, [pageContent, writingContent, selectedPage, isWritingPage]);

  // Convert plain text to RichText blocks with RichTextSpan arrays
  const plainTextToRichText = (text: string): RichText[] => {
    return text.split('\n\n').map((blockText) => {
      if (blockText.startsWith('# ')) {
        const content = blockText.slice(2);
        const spans: RichTextSpan[] = [{ text: content, isBold: false, isItalic: false }];
        return { 
          __kind__: 'heading' as const, 
          heading: { content: spans, level: HeadingLevel.h2 } 
        };
      }
      const spans: RichTextSpan[] = [{ text: blockText, isBold: false, isItalic: false }];
      return { __kind__: 'paragraph' as const, paragraph: { content: spans } };
    });
  };

  const handleSave = async () => {
    if (isWritingPage) {
      const updatedContent: WritingPageContent = {
        title,
        subtitle,
      };
      await updateWritingPage.mutateAsync(updatedContent);
    } else {
      const contentBlocks = plainTextToRichText(content);

      const updatedContent: PageContent = {
        title,
        subtitle,
        content: contentBlocks,
        links,
      };

      await updatePage.mutateAsync({ pageId: selectedPage, content: updatedContent });
    }
  };

  const addLink = () => {
    setLinks([...links, ['', '']]);
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...links];
    if (field === 'label') {
      newLinks[index] = [value, newLinks[index][1]];
    } else {
      newLinks[index] = [newLinks[index][0], value];
    }
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const isSaving = isWritingPage ? updateWritingPage.isPending : updatePage.isPending;

  return (
    <div className="space-y-6">
      <Tabs value={selectedPage} onValueChange={setSelectedPage}>
        <TabsList>
          {PAGE_IDS.map((id) => (
            <TabsTrigger key={id} value={id} className="capitalize">
              {id}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Edit {selectedPage.charAt(0).toUpperCase() + selectedPage.slice(1)} Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Page subtitle"
            />
          </div>

          {!isWritingPage && (
            <>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Page content (use # for headings, separate paragraphs with blank lines)"
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Start a line with # for headings. Separate paragraphs with blank lines.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Links</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLink}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </div>
                {links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={link[0]}
                      onChange={(e) => updateLink(index, 'label', e.target.value)}
                      placeholder="Label"
                    />
                    <Input
                      value={link[1]}
                      onChange={(e) => updateLink(index, 'url', e.target.value)}
                      placeholder="URL"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
