import { Sparkles } from "lucide-react";

export function TestingBanner() {
  return (
    <div
      role="status"
      aria-label="Site status notice"
      className="bg-[var(--layers-violet,oklch(0.66_0.16_282))] text-[oklch(0.99_0.005_282)] dark:bg-[oklch(0.30_0.08_282)] dark:text-[oklch(0.92_0.06_282)]"
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-2 px-6 py-2 text-[12px] font-medium tracking-[0.08em] uppercase md:px-10">
        <Sparkles size={13} aria-hidden="true" />
        We're in invite-only alpha — public sign-ups coming soon
      </div>
    </div>
  );
}
