import Link from "next/link";

export function PageHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>
      <Link
        href="/"
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        ← Hub
      </Link>
    </header>
  );
}
