export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-3 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">ottervote is not configured</h1>
      <p className="text-muted-foreground text-sm">
        Set <code>DATABASE_URL</code> to the vote app&apos;s Neon database, then run{" "}
        <code>pnpm --filter ottervote db:migrate</code> and{" "}
        <code>pnpm --filter ottervote db:seed</code>.
      </p>
    </main>
  );
}
