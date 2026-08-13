type Article = {
  id: string;
  title: string;
  source: string;
  canonicalUrl: string;
  publishedAt: string | Date;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function BriefingList({ articles, variant = "briefing" }: { articles: Article[]; variant?: "briefing" | "sources" }) {
  if (articles.length === 0) {
    return <div className="notice"><strong>No stories are indexed yet.</strong><p>Run the ingestion command to build the first briefing.</p></div>;
  }
  return (
    <ul className={`article-list article-list-${variant}`}>
      {articles.map((article) => (
        <li className="article-card" key={article.id}>
          <div>
            <p className="article-meta">
              <span>{article.source} <span aria-hidden="true">·</span> {formatDate(new Date(article.publishedAt))}</span>
              {variant === "sources" && <span className="record-id">Record {article.id.slice(-8).toUpperCase()}</span>}
            </p>
            <h3>{article.title}</h3>
          </div>
          <a href={article.canonicalUrl} target="_blank" rel="noreferrer">Read source <span aria-hidden="true">↗</span></a>
        </li>
      ))}
    </ul>
  );
}
