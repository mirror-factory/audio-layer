import { Sparkles } from "lucide-react";

export function TestingBanner() {
  return (
    <div
      role="status"
      aria-label="Site status notice"
      className="bg-[oklch(0.74_0.14_74)] text-[oklch(0.20_0.04_74)] dark:bg-[oklch(0.30_0.10_74)] dark:text-[oklch(0.94_0.05_74)]"
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-2 px-6 py-2 text-[12px] font-medium tracking-[0.08em] uppercase md:px-10">
        <Sparkles size={13} aria-hidden="true" />
        We're in invite-only alpha — public sign-ups coming soon
      </div>
    </div>
  );
}
