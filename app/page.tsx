import Link from "next/link";
import {
  TOOL_REGISTRY,
  SILENT_TOOLS,
  CUSTOM_UI_TOOLS,
  INTERACTIVE_TOOLS,
} from "@/lib/registry";

const installModes = [
  {
    name: "One-command install",
    detail:
      "Run init.sh from an existing project. It copies templates, docs, tests, observability assets, and AI guidance into that app.",
  },
  {
    name: "LLM-guided install",
    detail:
      "Give the prompt files to your coding agent. The agent scans your project, places files in the right folders, and verifies after each phase.",
  },
];

const verificationLayers = [
  "Registry-driven derived files keep tool docs, fixtures, and helper registries in sync.",
  "Compliance and tests check the project shape, registry coverage, and runtime logic.",
  "Observability and the hub page give humans one place to understand what was installed and where to inspect it.",
];

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-neutral-100">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{hint}</p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-neutral-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,hsl(205_70%_18%),transparent_32%),linear-gradient(180deg,hsl(224_25%_8%),hsl(224_24%_5%))] text-neutral-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 pb-20 md:px-6 md:py-8">
        <header className="rounded-[28px] border border-cyan-500/20 bg-neutral-950/75 p-6 shadow-[0_24px_80px_rgba(8,145,178,0.12)]">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">
                Vercel AI Starter Kit{" "}
                <span className="ml-2 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                  v0.0.4
                </span>
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-4xl">
                One place to see what the starter installs, enforces, and proves.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300">
                This reference app is the product demo for the kit. It shows the
                expected app shape, the tool registry model, the observability
                route, and the verification flow an existing project should end
                up with after install.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:ml-auto md:flex md:w-auto md:flex-wrap">
              <Link
                href="/record"
                className="flex min-h-[44px] items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-emerald-300"
              >
                New recording
              </Link>
              <Link
                href="/meetings"
                className="flex min-h-[44px] items-center justify-center rounded-full border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-950/30"
              >
                All meetings
              </Link>
              <Link
                href="/chat"
                className="flex min-h-[44px] items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-cyan-300"
              >
                Open Chat Demo
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-[44px] items-center justify-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Pricing
              </Link>
              <Link
                href="/usage"
                className="flex min-h-[44px] items-center justify-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Usage
              </Link>
              <Link
                href="/profile"
                className="flex min-h-[44px] items-center justify-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="flex min-h-[44px] items-center justify-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Settings
              </Link>
              <Link
                href="/observability"
                className="flex min-h-[44px] items-center justify-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-900"
              >
                Open Observability
              </Link>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Tools"
            value={String(TOOL_REGISTRY.length)}
            hint="Single registry powers UI rendering, tests, and docs."
          />
          <StatCard
            label="Custom UI"
            value={String(CUSTOM_UI_TOOLS.size)}
            hint="Tools that render visible cards in chat."
          />
          <StatCard
            label="Interactive"
            value={String(INTERACTIVE_TOOLS.size)}
            hint="Client-side tools that ask the user for input."
          />
          <StatCard
            label="Silent"
            value={String(SILENT_TOOLS.size)}
            hint="Background tools that update state without noisy chat output."
          />
        </div>

        <Section
          title="Simple user flow"
          description="This is the simple story the buyer, operator, or teammate should understand without reading the whole repo."
        >
          <ol className="grid gap-4 md:grid-cols-2">
            <li className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
              <p className="text-sm font-semibold text-neutral-100">
                1. Install the kit into an existing project
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                The project gets tool registry templates, tests, observability
                assets, docs, agent instructions, and setup scripts.
              </p>
            </li>
            <li className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
              <p className="text-sm font-semibold text-neutral-100">
                2. Define or scan the project&apos;s tools
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                The registry does not move files. It classifies tools and becomes
                the source of truth for labels, types, UI behavior, docs, and
                tests.
              </p>
            </li>
            <li className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
              <p className="text-sm font-semibold text-neutral-100">
                3. Generate the derived assets
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Generated fixtures, compressed agent context, and tool docs stay
                synchronized with the registry instead of being hand-maintained.
              </p>
            </li>
            <li className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
              <p className="text-sm font-semibold text-neutral-100">
                4. Verify and inspect
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Run the tests, open observability, and use the hub page to check
                what was installed, what is enforced, and where to look next.
              </p>
            </li>
          </ol>
        </Section>

        <Section
          title="What users actually get"
          description="The starter should feel like a guided system, not a random folder dump."
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="text-sm font-semibold text-neutral-100">
                Install modes
              </p>
              <div className="mt-4 space-y-4">
                {installModes.map((mode) => (
                  <div key={mode.name} className="rounded-2xl bg-neutral-950/80 p-4">
                    <p className="text-sm font-medium text-neutral-100">
                      {mode.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      {mode.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="text-sm font-semibold text-neutral-100">
                Built-in routes
              </p>
              <div className="mt-4 space-y-3 text-sm text-neutral-400">
                <div className="rounded-2xl bg-neutral-950/80 p-4">
                  <p className="font-medium text-neutral-100">/</p>
                  <p className="mt-1">The central hub you are reading now.</p>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 p-4">
                  <p className="font-medium text-neutral-100">/record</p>
                  <p className="mt-1">
                    Upload or record audio, transcribe via AssemblyAI
                    Universal-3 Pro, and get a structured meeting summary from
                    the Gateway.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 p-4">
                  <p className="font-medium text-neutral-100">/record/live</p>
                  <p className="mt-1">
                    Live streaming transcription over WebSocket with
                    partial-turn updates. Uses the u3-rt-pro model and
                    ephemeral tokens.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 p-4">
                  <p className="font-medium text-neutral-100">/meetings</p>
                  <p className="mt-1">
                    Recent recordings persisted in Supabase (or the dev
                    in-memory store). Click any row for the detail view.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 p-4">
                  <p className="font-medium text-neutral-100">/chat</p>
                  <p className="mt-1">
                    The live chat route showing tools, streaming, and UI parts.
                  </p>
                </div>
                <div className="rounded-2xl bg-neutral-950/80 p-4">
                  <p className="font-medium text-neutral-100">/observability</p>
                  <p className="mt-1">
                    The route where operators inspect AI calls, costs, and
                    failures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Registry model"
          description="The registry is a source-of-truth layer. It tells the app and the agent how each tool should be handled."
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="text-sm font-semibold text-neutral-100">
                What the registry does
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
                <li>Defines labels, categories, tool type, and UI behavior.</li>
                <li>Generates helper registries such as silent/custom/interactive sets.</li>
                <li>Feeds derived test fixtures and compressed agent context.</li>
                <li>Gives the AI a stable map instead of asking it to infer from memory.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="text-sm font-semibold text-neutral-100">
                Current reference tools
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {TOOL_REGISTRY.map((tool) => (
                  <div
                    key={tool.name}
                    className="rounded-2xl bg-neutral-950/80 p-4"
                  >
                    <p className="text-sm font-medium text-neutral-100">
                      {tool.label}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
                      {tool.name}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                      {tool.description}
                    </p>
                    <p className="mt-3 text-xs text-neutral-500">
                      {tool.type} · {tool.ui} · {tool.category}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Verification and docs"
          description="This is the promise surface: what gets checked, what stays fresh, and how humans inspect it."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="text-sm font-semibold text-neutral-100">
                Verification layers
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
                {verificationLayers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
              <p className="text-sm font-semibold text-neutral-100">
                Docs freshness model
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-400">
                <li>Generated docs should be rebuilt from code and checked for diff.</li>
                <li>Local authored docs should carry review ownership and update date.</li>
                <li>
                  External docs should live in a manifest with priority, source URL,
                  and freshness metadata so retrieval can stay scoped.
                </li>
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
