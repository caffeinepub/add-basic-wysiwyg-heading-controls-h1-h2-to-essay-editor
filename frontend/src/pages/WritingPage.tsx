import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useListPublishedEssays, useGetAllTags, useGetWritingPageContent } from '../hooks/useQueries';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

export default function WritingPage() {
  const navigate = useNavigate();
  const { data: essays, isLoading: essaysLoading } = useListPublishedEssays();
  const { data: allTags } = useGetAllTags();
  const { data: writingContent, isLoading: contentLoading } = useGetWritingPageContent();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredEssays = selectedTag
    ? essays?.filter((essay) => essay.tags.includes(selectedTag))
    : essays;

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (essaysLoading || contentLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <Skeleton className="h-12 w-1/2 mb-12" />
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          {writingContent?.title || 'Writing'}
        </h1>
        <p className="text-xl text-muted-foreground">
          {writingContent?.subtitle || 'Essays and thoughts'}
        </p>
      </div>

      {allTags && allTags.length > 0 && (
        <div className="mb-12 flex flex-wrap gap-2">
          <Badge
            variant={selectedTag === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedTag(null)}
          >
            All
          </Badge>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {filteredEssays && filteredEssays.length > 0 ? (
        <div className="space-y-12">
          {filteredEssays.map((essay) => (
            <article
              key={essay.id.toString()}
              className="group cursor-pointer"
              onClick={() => navigate({ to: '/essay/$essayId', params: { essayId: essay.id.toString() } })}
            >
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight group-hover:text-muted-foreground transition-colors">
                  {essay.title}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <time>{formatDate(essay.publishDate)}</time>
                  {essay.tags.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex gap-2">
                        {essay.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">{essay.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No essays found.</p>
      )}
    </div>
  );
}
