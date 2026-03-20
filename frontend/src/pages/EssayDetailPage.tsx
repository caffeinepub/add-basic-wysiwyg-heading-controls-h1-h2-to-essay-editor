import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetPublishedEssay } from '../hooks/useQueries';
import RichTextRenderer from '../components/RichTextRenderer';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

export default function EssayDetailPage() {
  const { essayId } = useParams({ from: '/essay/$essayId' });
  const navigate = useNavigate();
  const { data: essay, isLoading, error } = useGetPublishedEssay(essayId ? BigInt(essayId) : null);

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <Skeleton className="h-8 w-24 mb-8" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !essay) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <Button variant="ghost" onClick={() => navigate({ to: '/writing' })} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Writing
        </Button>
        <p className="text-muted-foreground">Essay not found.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-6 py-16">
      <Button variant="ghost" onClick={() => navigate({ to: '/writing' })} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Writing
      </Button>

      <article>
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-4 tracking-tight leading-tight">{essay.title}</h1>
          <p className="text-xl text-muted-foreground mb-6 leading-relaxed">{essay.subtitle}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
            <time>{formatDate(essay.publishDate)}</time>
            {essay.tags.length > 0 && (
              <>
                <span>•</span>
                <div className="flex gap-2">
                  {essay.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
          {essay.heroImage && (
            <div className="mb-12 -mx-6 md:mx-0">
              <img
                src={essay.heroImage.getDirectURL()}
                alt={essay.title}
                className="w-full rounded-lg"
              />
            </div>
          )}
        </header>

        <div className="essay-content">
          <RichTextRenderer content={essay.body} />
        </div>
      </article>
    </div>
  );
}
