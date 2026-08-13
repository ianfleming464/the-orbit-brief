import { BriefingList } from "@/components/briefing-list";
import { ChatShell } from "@/components/chat-shell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let articles;
  try {
    articles = await db.article.findMany({
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: { id: true, title: true, source: true, canonicalUrl: true, publishedAt: true },
    });
  } catch {
    return (
      <main className="shell">
        <header className="masthead"><p className="eyebrow">Space news / source index</p><h1>The Orbit Brief</h1></header>
        <section className="notice notice-error" role="alert"><strong>The briefing is not connected yet.</strong><p>Check DATABASE_URL, run the Prisma migration, and load the source feed.</p></section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <p className="eyebrow">Space news / source index</p>
        <h1>The Orbit Brief</h1>
        <p className="dek">Search recent space news. Every answer links back to its source.</p>
      </header>
      <ChatShell />
      <section className="briefing" aria-labelledby="briefing-heading">
        <div className="section-heading"><p className="eyebrow">Latest records</p><h2 id="briefing-heading">Recent stories</h2></div>
        <BriefingList articles={articles} />
      </section>
    </main>
  );
}
