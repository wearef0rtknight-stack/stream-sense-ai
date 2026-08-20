import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Options that get a neon check indicator when active. */
  checkable?: readonly string[];
};

export function PillRail({ label, hint, options, selected, onToggle, checkable = [] }: Props) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between px-5">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </h2>
        {hint ? <span className="text-[0.65rem] text-muted-foreground/70">{hint}</span> : null}
      </div>

      <div className="rail pb-1">
        {options.map((opt) => {
          const active = selected.includes(opt);
          const showCheck = active && checkable.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(opt)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.96]",
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-lift"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
                showCheck && "bg-neon text-neon-foreground neon-ring",
              )}
            >
              {showCheck ? <Check className="size-3.5 stroke-[3]" /> : null}
              {opt}
            </button>
          );
        })}
        <span className="w-1" aria-hidden />
      </div>
    </section>
  );
}
