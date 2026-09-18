import Link from "next/link";
import { isDatabaseConfigured } from "@/lib/db/client";
import { getStatsByLora, getVotesPerDay } from "@/lib/pairs";
import { SetupNotice } from "@/components/setup-notice";

export const dynamic = "force-dynamic";

function percent(value: number, total: number) {
  return total === 0 ? "—" : `${Math.round((value / total) * 100)}%`;
}

export default async function StatsPage() {
  if (!isDatabaseConfigured()) {
    return <SetupNotice />;
  }

  const [byLora, perDay] = await Promise.all([getStatsByLora(), getVotesPerDay()]);
  const trainable = byLora.reduce((sum, row) => sum + row.decided, 0);
  const busiestDay = Math.max(1, ...perDay.map((row) => row.votes));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">stats</h1>
        <Link className="text-muted-foreground text-sm underline-offset-4 hover:underline" href="/">
          vote
        </Link>
      </header>

      <section className="border-border bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          decisive pairs ready for training
        </p>
        <p className="font-mono text-3xl">{trainable}</p>
      </section>

      <section className="border-border bg-card rounded-xl border p-4">
        <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">by lora version</p>
        {byLora.length === 0 ? (
          <p className="text-muted-foreground text-sm">No votes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="font-normal">version</th>
                <th className="font-normal">decisive</th>
                <th className="font-normal">A wins</th>
                <th className="font-normal">ties</th>
                <th className="font-normal">skips</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {byLora.map((row) => (
                <tr key={row.loraVersion}>
                  <td>{row.loraVersion}</td>
                  <td>{row.decided}</td>
                  <td>{percent(row.aWins, row.decided)}</td>
                  <td>{row.ties}</td>
                  <td>{row.skips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="border-border bg-card rounded-xl border p-4">
        <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">votes per day</p>
        {perDay.length === 0 ? (
          <p className="text-muted-foreground text-sm">No votes yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {perDay.map((row) => (
              <li className="flex items-center gap-3" key={row.day}>
                <span className="text-muted-foreground w-24 font-mono text-xs">{row.day}</span>
                <span
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${(row.votes / busiestDay) * 100}%` }}
                />
                <span className="font-mono text-xs">{row.votes}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
