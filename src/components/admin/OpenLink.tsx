import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Opens an object URL in a new tab. Shows a disabled button until the blob has loaded. */
export function OpenLink({ url, children, className }: { url: string | null; children: ReactNode; className?: string }) {
  if (!url) {
    return (
      <Button type="button" variant="outline" disabled className={cn('min-h-11', className)}>
        <ExternalLink aria-hidden className="size-4" />
        {children}
      </Button>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 px-3', className)}
    >
      <ExternalLink aria-hidden className="size-4" />
      {children}
    </a>
  );
}
