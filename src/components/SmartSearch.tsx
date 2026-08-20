import { useState, type FormEvent } from "react";
import { Search, X, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  suggestions: readonly string[];
};

export function SmartSearch({ tags, onAddTag, onRemoveTag, suggestions }: Props) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!trimmed) return;
    onAddTag(trimmed);
    setValue("");
  };

  const open = trimmed.length > 0;

  return (
    <div className="px-5">
      <form onSubmit={submit} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 transition-all duration-300",
            open && "neon-ring border-transparent",
          )}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Describe it: "prison se bhagne wale group"'
            aria-label="Search by descriptive phrase or keyword"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          {trimmed ? (
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-full bg-neon px-2.5 py-1 text-[0.7rem] font-semibold text-neon-foreground"
            >
              <Plus className="size-3 stroke-[3]" />
              Tag
            </button>
          ) : null}
        </div>
      </form>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 py-1.5 pl-3 pr-1.5 text-xs text-foreground"
            >
              {t}
              <button
                type="button"
                onClick={() => onRemoveTag(t)}
                aria-label={`Remove ${t}`}
                className="rounded-full bg-background/60 p-0.5 text-muted-foreground transition-colors hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-neon" />
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAddTag(s)}
                className="rounded-full border border-dashed border-border px-2.5 py-1 text-[0.7rem] text-muted-foreground transition-colors hover:border-neon hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
