export function Placeholder({ title }: { title: string }) {
  return (
    <section data-testid={`screen-${title.toLowerCase()}`}>
      <h1 className="title">
        {title}
        <span className="pink">.</span>
      </h1>
      <p className="placeholder">Coming soon.</p>
    </section>
  );
}
