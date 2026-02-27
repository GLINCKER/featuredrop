import Link from 'next/link'

const featureHighlights = [
  {
    title: 'Ship in minutes',
    body: 'Drop in a provider, map your manifest, and ship badges or changelogs without a backend rewrite.'
  },
  {
    title: 'Headless by design',
    body: 'Use built-in UI or wire the core primitives into your own design system with zero vendor lock-in.'
  },
  {
    title: 'Production guardrails',
    body: 'Schema validation, offline adapters, retries, and size/security checks are built into the workflow.'
  }
]

export default function HomePage() {
  return (
    <main className="home">
      <section className="hero">
        <p className="eyebrow">Open source product adoption toolkit</p>
        <h1>Feature launches without SaaS lock-in.</h1>
        <p className="lead">
          featuredrop gives you changelogs, tours, checklists, and analytics primitives in one package.
        </p>
        <div className="actions">
          <Link className="primary" href="/docs/quickstart">
            Start Quickstart
          </Link>
          <Link className="secondary" href="/playground">
            Open Playground
          </Link>
        </div>
      </section>

      <section className="highlights" aria-label="Why featuredrop">
        {featureHighlights.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <style jsx>{`
        .home {
          display: grid;
          gap: 2rem;
          padding: 2rem 0 3rem;
        }

        .hero {
          background: linear-gradient(145deg, #0d1b2a 0%, #1b263b 55%, #415a77 100%);
          border-radius: 20px;
          color: #f9fafb;
          padding: clamp(1.5rem, 3vw, 2.75rem);
        }

        .eyebrow {
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.75rem;
          margin: 0 0 0.75rem;
          opacity: 0.85;
        }

        h1 {
          margin: 0;
          font-size: clamp(1.9rem, 4.5vw, 3rem);
          line-height: 1.1;
          max-width: 14ch;
        }

        .lead {
          margin: 1rem 0 0;
          max-width: 56ch;
          line-height: 1.65;
          font-size: 1.04rem;
          color: rgba(249, 250, 251, 0.95);
        }

        .actions {
          margin-top: 1.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .actions :global(a) {
          border-radius: 999px;
          padding: 0.62rem 1.05rem;
          font-weight: 600;
          text-decoration: none;
          transition: transform 0.18s ease;
        }

        .actions :global(a:hover) {
          transform: translateY(-1px);
        }

        .primary {
          background: #ffd166;
          color: #111827;
        }

        .secondary {
          border: 1px solid rgba(255, 255, 255, 0.35);
          color: #f9fafb;
          background: rgba(255, 255, 255, 0.06);
        }

        .highlights {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
          gap: 0.85rem;
        }

        .highlights article {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 1rem;
          background: #ffffff;
        }

        .highlights h2 {
          margin: 0 0 0.45rem;
          font-size: 1rem;
        }

        .highlights p {
          margin: 0;
          line-height: 1.55;
          color: #4b5563;
        }

        @media (max-width: 640px) {
          .home {
            padding-top: 1rem;
          }
        }
      `}</style>
    </main>
  )
}
