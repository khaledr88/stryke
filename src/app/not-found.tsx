import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="display text-7xl text-white">Off target</h1>
      <p className="text-silver">This page doesn’t exist.</p>
      <Link href="/" className="cut bg-red px-8 py-3 font-display font-semibold uppercase tracking-[0.14em] text-white">
        Back home
      </Link>
    </main>
  );
}
