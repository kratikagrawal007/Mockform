import { Monitor } from "lucide-react";
import { Logo } from "./Logo";

/** The editor needs room for two panels and a canvas, so phones get this instead. */
export function SmallScreenNotice() {
  return (
    <div
      data-testid="small-screen-notice"
      className="flex h-dvh flex-col items-center justify-center gap-5 bg-workspace px-6 text-center md:hidden"
    >
      <Logo />
      <div className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
        <Monitor className="size-5" aria-hidden />
      </div>
      <div className="max-w-xs space-y-2">
        <h1 className="text-[17px] font-semibold tracking-[-0.01em]">
          Mockform needs a bigger screen
        </h1>
        <p className="text-muted">
          Open it on a tablet or computer at least 768&nbsp;px wide to start
          making mockups.
        </p>
      </div>
    </div>
  );
}
