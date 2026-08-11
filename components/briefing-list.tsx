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

export function BriefingList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return <div className="notice"><strong>No stories are indexed yet.</strong><p>Run the ingestion command to build the first briefing.</p></div>;
  }
  return (
    <ul className="article-list">
      {articles.map((article) => (
        <li className="article-card" key={article.id}>
          <div><p className="article-meta">{article.source} <span aria-hidden="true">·</span> {formatDate(new Date(article.publishedAt))}</p><h3>{article.title}</h3></div>
          <a href={article.canonicalUrl} target="_blank" rel="noreferrer">Read source <span aria-hidden="true">↗</span></a>
        </li>
      ))}
    </ul>
  );
}
