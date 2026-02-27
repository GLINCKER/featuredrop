const demos = [
  {
    title: 'Local React sandbox',
    href: 'https://github.com/GLINCKER/featuredrop/tree/main/examples/sandbox-react',
    desc: 'Run the sandbox from this repo with `pnpm playground`.'
  },
  {
    title: 'StackBlitz template',
    href: 'https://stackblitz.com/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react',
    desc: 'Launch a browser-only environment for fast trials.'
  },
  {
    title: 'CodeSandbox template',
    href: 'https://codesandbox.io/p/sandbox/github/GLINCKER/featuredrop/tree/main/examples/sandbox-react',
    desc: 'Fork a hosted sandbox and share demos quickly.'
  }
]

export default function PlaygroundPage() {
  return (
    <main>
      <h1>Playground</h1>
      <p>
        Use the sandbox to validate manifest structure, component styling, and rollout flow before integrating
        into production.
      </p>
      <div className="grid">
        {demos.map((demo) => (
          <a key={demo.href} className="card" href={demo.href} target="_blank" rel="noreferrer">
            <h2>{demo.title}</h2>
            <p>{demo.desc}</p>
          </a>
        ))}
      </div>
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.9rem;
          margin-top: 1rem;
        }

        .card {
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 1rem;
          text-decoration: none;
          color: inherit;
          background: #fff;
        }

        .card:hover {
          border-color: #111827;
        }

        h2 {
          margin: 0 0 0.35rem;
          font-size: 1rem;
        }

        p {
          margin: 0;
          line-height: 1.55;
        }
      `}</style>
    </main>
  )
}
