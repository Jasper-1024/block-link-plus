# HTML Report Format

The architectural review is rendered as a single self-contained HTML file in the OS temp directory. Tailwind and Mermaid both come from CDNs. Mermaid handles graph-shaped diagrams reliably; hand-built divs and inline SVG handle the more editorial visuals. Mix the two - don't lean on Mermaid for everything.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review - {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Candidate card

Each candidate is one `<article>`:

- **Title** - short, names the deepening.
- **Badge row** - recommendation strength (`Strong`, `Worth exploring`, `Speculative`) plus dependency category.
- **Files** - monospaced list.
- **Before / After diagram** - the centrepiece.
- **Problem** - one sentence.
- **Solution** - one sentence.
- **Wins** - bullets, six words or fewer.
- **ADR callout** - only if an ADR conflict is real enough to revisit.

No paragraphs of explanation. If the diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns

- Mermaid graph for dependencies and call flow.
- Hand-built boxes-and-arrows when Mermaid layout fights you.
- Cross-section for layered shallowness.
- Mass diagram for interface nearly as wide as implementation.
- Call-graph collapse for shallow module clusters.

## Tone

Use exactly: module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality.

Never substitute: component, service, unit, API, signature, boundary.
