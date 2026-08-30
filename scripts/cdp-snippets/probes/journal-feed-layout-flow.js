// CDP probe: Journal Feed must preserve Obsidian's readable-line-length
// preference while keeping each date heading aligned with its Markdown body.
//
// Run:
//   node scripts/obsidian-cdp.js --port <task-port> eval-file scripts/cdp-snippets/probes/journal-feed-layout-flow.js
//
// Preconditions: an open Journal Feed view, one native Markdown view, and at
// least two Markdown day sections in the isolated runtime.

(async () => {
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const normalizeMaxWidth = (value) => value || "none";

  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  let view = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view?.containerEl?.querySelector?.(".blp-journal-feed-root")) view = leaf.view;
  });

  assert(view, "No open Journal Feed view found.");
  const section = view.sections?.find((candidate) => candidate.renderMode === "markdown");
  const virtualSection = view.sections?.find((candidate) => candidate !== section && candidate.renderMode === "markdown");
  assert(section && virtualSection, "Journal Feed needs two Markdown day sections.");
  if (virtualSection.embed) await view.unmountSectionEditor(virtualSection);
  assert(!virtualSection.embed, "Virtual day must be unmounted for this lifecycle check.");

  await view.mountSectionEditor(section, { focus: false, bridge: false });
  await wait(250);

  const root = section.sectionEl.closest(".blp-journal-feed-root");
  const header = section.sectionEl.querySelector(".blp-journal-feed-day-header");
  const source = section.sectionEl.querySelector(".markdown-source-view.mod-cm6");
  const sizer = source?.querySelector(".cm-sizer");
  const content = source?.querySelector(".cm-content");
  const nativeSource = [...document.querySelectorAll(".markdown-source-view.mod-cm6")]
    .find((candidate) => !candidate.closest(".blp-journal-feed-root"));
  const nativeSizer = nativeSource?.querySelector(".cm-sizer");
  const nativeContent = nativeSource?.querySelector(".cm-content");
  assert(header && source && sizer && content && root && nativeSizer && nativeContent, "Mounted Journal Feed/native Markdown DOM is incomplete.");

  const originalReadableLineLength = app.vault.getConfig("readableLineLength");
  const fileLineWidth = getComputedStyle(document.body).getPropertyValue("--file-line-width").trim();

  const runCase = async (enabled) => {
    await app.vault.setConfig("readableLineLength", enabled);
    await wait(350);

    const currentSource = section.sectionEl.querySelector(".markdown-source-view.mod-cm6");
    const currentSizer = currentSource?.querySelector(".cm-sizer");
    const currentContent = currentSource?.querySelector(".cm-content");
    const currentNativeSource = [...document.querySelectorAll(".markdown-source-view.mod-cm6")]
      .find((candidate) => !candidate.closest(".blp-journal-feed-root"));
    const currentNativeSizer = currentNativeSource?.querySelector(".cm-sizer");
    const currentNativeContent = currentNativeSource?.querySelector(".cm-content");
    assert(currentSource && currentSizer && currentContent && currentNativeSizer && currentNativeContent, "Mounted Journal Feed/native Markdown DOM is incomplete.");
    const feedSizerStyle = getComputedStyle(currentSizer);
    const nativeSizerStyle = getComputedStyle(currentNativeSizer);
    const feedContentStyle = getComputedStyle(currentContent);
    const nativeContentStyle = getComputedStyle(currentNativeContent);
    const inlineStart = (style) => style.getPropertyValue("padding-inline-start") || style.getPropertyValue("padding-left");
    const feedContentBlockStart = Math.round(currentContent.getBoundingClientRect().top - currentSizer.getBoundingClientRect().top);
    const nativeContentBlockStart = Math.round(currentNativeContent.getBoundingClientRect().top - currentNativeSizer.getBoundingClientRect().top);
    const dateToContentGap = Math.round(currentSource.getBoundingClientRect().top - header.getBoundingClientRect().bottom);
    const declaredDateToContentGap = Math.round(parseFloat(getComputedStyle(header).marginBlockEnd));
    const dayStyle = getComputedStyle(section.sectionEl);
    const virtualDayStyle = getComputedStyle(virtualSection.sectionEl);
    const headerOffset = Math.round(Math.abs(header.getBoundingClientRect().left - currentSizer.getBoundingClientRect().left));
    const overflow = Math.max(0, root.scrollWidth - root.clientWidth);

    assert(root.dataset.blpReadableLineLength === String(enabled), `Root preference state did not update to ${enabled}.`);
    assert(currentSource.classList.contains("is-readable-line-width") === enabled, `Expected source readable-line-width=${enabled}.`);
    assert(normalizeMaxWidth(feedSizerStyle.maxWidth) === normalizeMaxWidth(nativeSizerStyle.maxWidth), `Feed/native sizer max-width differ: ${feedSizerStyle.maxWidth} vs ${nativeSizerStyle.maxWidth}.`);
    assert(inlineStart(feedContentStyle) === inlineStart(nativeContentStyle), `Feed/native content inline inset differ: ${inlineStart(feedContentStyle)} vs ${inlineStart(nativeContentStyle)}.`);
    assert(feedContentBlockStart === nativeContentBlockStart, `Feed/native content block start differ: ${feedContentBlockStart}px vs ${nativeContentBlockStart}px.`);
    assert(dateToContentGap === declaredDateToContentGap, `Journal date/content gap differs from the declared header margin: ${dateToContentGap}px vs ${declaredDateToContentGap}px.`);
    assert(dayStyle.maxInlineSize === virtualDayStyle.maxInlineSize, "Mounted and virtual Markdown days must share the same width constraint.");
    if (enabled) {
      assert(dayStyle.maxInlineSize === feedSizerStyle.maxWidth, `Day/sizer width differ: ${dayStyle.maxInlineSize} vs ${feedSizerStyle.maxWidth}.`);
    }
    assert(headerOffset === 0, `Journal date/content inline offset must be 0; got ${headerOffset}.`);
    assert(overflow === 0, `Journal Feed must not overflow horizontally; got ${overflow}.`);

    return {
      enabled,
      headerOffset,
      overflow,
      feedSizer: { maxWidth: feedSizerStyle.maxWidth, marginInlineStart: feedSizerStyle.marginInlineStart },
      nativeSizer: { maxWidth: nativeSizerStyle.maxWidth, marginInlineStart: nativeSizerStyle.marginInlineStart },
      feedContentInlineInset: inlineStart(feedContentStyle),
      nativeContentInlineInset: inlineStart(nativeContentStyle),
      feedContentBlockStart,
      nativeContentBlockStart,
      dateToContentGap,
      declaredDateToContentGap,
      dayMaxInlineSize: dayStyle.maxInlineSize,
      virtualDayMaxInlineSize: virtualDayStyle.maxInlineSize,
    };
  };

  try {
    const unrestricted = await runCase(false);
    const constrained = await runCase(true);
    const hasInContentToolbar = Boolean(root.querySelector(".blp-journal-feed-header, .blp-journal-feed-title-row"));
    assert(!hasInContentToolbar, "Journal Feed must not render an in-content toolbar.");

    return {
      kind: "probe",
      scenario: "journal-feed-layout-flow",
      status: "passed",
      evidence: {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        fileLineWidth,
        unrestricted,
        constrained,
        hasInContentToolbar,
      },
      cleanup: { status: "passed", warnings: [] },
    };
  } finally {
    await app.vault.setConfig("readableLineLength", originalReadableLineLength);
    await wait(350);
  }
})();
