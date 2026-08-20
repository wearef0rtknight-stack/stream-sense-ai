import { Link } from "@tanstack/react-router";
import { Globe2, Languages } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary">
            <Languages className="size-4 text-primary-foreground" />
          </span>
          <span className="font-display text-base font-bold tracking-tight">
            Dubbed<span className="text-neon">.</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Streaming language search</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-medium text-foreground">
            <Globe2 className="size-3 text-neon" />
            India
          </span>
        </nav>
      </div>
    </header>
  );
}
