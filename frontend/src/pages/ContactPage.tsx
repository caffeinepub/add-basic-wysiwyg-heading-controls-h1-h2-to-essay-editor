import { useGetPageContent } from '../hooks/useQueries';
import RichTextRenderer from '../components/RichTextRenderer';
import { Skeleton } from '../components/ui/skeleton';

export default function ContactPage() {
  const { data: pageContent, isLoading, error } = useGetPageContent('contact');

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
        <p className="text-muted-foreground">Failed to load page content.</p>
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
          <h2 className="text-lg font-semibold mb-4">Links</h2>
          <div className="flex flex-col gap-3">
            {pageContent.links.map(([label, url], index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium hover:underline inline-flex items-center gap-2"
              >
                {label} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
