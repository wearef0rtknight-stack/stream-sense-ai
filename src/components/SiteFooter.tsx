export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-display text-sm font-bold">
              Dubbed<span className="text-neon">.</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              A free web tool that tells you where a title streams and whether a real Hindi dubbed
              audio track exists — not just subtitles.
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Coverage
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>Netflix · Prime Video · JioCinema</li>
              <li>Disney+ Hotstar · Zee5 · SonyLIV</li>
              <li>Movies, series, anime, documentaries</li>
            </ul>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Data
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>Box office & budget via Wikipedia</li>
              <li>Ratings shown as a tomato meter</li>
              <li>Taste profile stored on your device only</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-5 text-[0.68rem] text-muted-foreground/70">
          Availability and audio tracks change often. Always confirm on the streaming service
          before subscribing. All platform names belong to their respective owners.
        </p>
      </div>
    </footer>
  );
}
