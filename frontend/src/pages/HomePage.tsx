import { useGetPageContent, useInitializeDefaultPages } from '../hooks/useQueries';
import RichTextRenderer from '../components/RichTextRenderer';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

export default function HomePage() {
  const { data: pageContent, isLoading, error } = useGetPageContent('home');
  const initPages = useInitializeDefaultPages();

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Tomwm</h1>
          <p className="text-muted-foreground mb-6">
            This page hasn't been set up yet. Initialize default content to get started.
          </p>
          <Button onClick={() => initPages.mutate()} disabled={initPages.isPending}>
            {initPages.isPending ? 'Initializing...' : 'Initialize Default Pages'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">{pageContent?.title}</h1>
        {pageContent?.subtitle && (
          <p className="text-xl text-muted-foreground">{pageContent.subtitle}</p>
        )}
      </div>

      {pageContent?.content && <RichTextRenderer content={pageContent.content} />}

      {pageContent?.links && pageContent.links.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4">
            {pageContent.links.map(([label, url], index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
