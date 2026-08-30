// CDP probe: Journal Feed date headers and mounted Markdown content must share
// one responsive inline flow without an in-content toolbar.
//
// Run:
//   node scripts/obsidian-cdp.js --port <task-port> eval-file scripts/cdp-snippets/probes/journal-feed-layout-flow.js
//
// Preconditions: an open Journal Feed view with at least one Markdown day.

(async () => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  let view = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view?.containerEl?.querySelector?.(".blp-journal-feed-root")) view = leaf.view;
  });

  assert(view, "No open Journal Feed view found.");
  const section = view.sections?.find((candidate) => candidate.renderMode === "markdown");
  assert(section, "Journal Feed has no Markdown day section.");

  await view.mountSectionEditor(section, { focus: false, bridge: false });
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  const header = section.sectionEl.querySelector(".blp-journal-feed-day-header");
  const sizer = section.sectionEl.querySelector(".markdown-source-view.mod-cm6.is-readable-line-width .cm-sizer");
  const root = section.sectionEl.closest(".blp-journal-feed-root");
  assert(header && sizer && root, "Mounted Markdown Journal Feed DOM is incomplete.");

  const headerOffset = Math.round(Math.abs(header.getBoundingClientRect().left - sizer.getBoundingClientRect().left));
  const overflow = Math.max(0, root.scrollWidth - root.clientWidth);
  const hasInContentToolbar = Boolean(root.querySelector(".blp-journal-feed-header, .blp-journal-feed-title-row"));

  assert(headerOffset === 0, `Journal date/content inline offset must be 0; got ${headerOffset}.`);
  assert(overflow === 0, `Journal Feed must not overflow horizontally; got ${overflow}.`);
  assert(!hasInContentToolbar, "Journal Feed must not render an in-content toolbar.");

  return {
    kind: "probe",
    scenario: "journal-feed-layout-flow",
    status: "passed",
    evidence: {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      headerOffset,
      overflow,
      hasInContentToolbar,
      markdownClasses: sizer.closest(".markdown-source-view")?.className ?? null,
    },
    cleanup: { status: "not-applicable", warnings: [] },
  };
})();