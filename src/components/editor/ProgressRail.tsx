import { Check } from "lucide-react";

const STEPS = ["Add a screenshot", "Pick a device", "Export"] as const;

/** Top-of-stage guide showing where the user is in the three-step flow. */
export function ProgressRail({ current = 0 }: { current?: number }) {
  return (
    <ol
      aria-label="Getting started"
      className="mf-glass-pill flex items-center gap-1 rounded-full p-1 text-label"
    >
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step}
            className="flex items-center gap-1"
            aria-current={active ? "step" : undefined}
          >
            {i > 0 && (
              <span
                aria-hidden
                className={`h-px w-5 ${done || active ? "bg-accent" : "bg-border-strong"}`}
              />
            )}
            <span
              className={`flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 ${
                active
                  ? "bg-accent-soft text-ink"
                  : done
                    ? "text-muted"
                    : "text-faint"
              }`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full font-mono text-[10px] font-semibold ${
                  active || done
                    ? "mf-accent-gloss text-on-accent"
                    : "mf-well text-muted"
                }`}
              >
                {done ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
