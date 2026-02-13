(() => {
  function matches(rule) {
    if (!rule || rule.type !== 1) return false;
    const sel = rule.selectorText || "";
    return sel.includes("cm-selectionBackground") || sel.includes("cm-selection") || sel.includes("cm-content") && sel.includes("selection");
  }

  function walk(rules, out, sheet) {
    if (!rules) return;
    for (const rule of Array.from(rules)) {
      if (matches(rule)) {
        out.push({
          sheet: sheet.href || "inline",
          selector: rule.selectorText || "",
          style: rule.style ? rule.style.cssText : "",
        });
      }
      if (rule.cssRules) walk(rule.cssRules, out, sheet);
    }
  }

  const out = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walk(rules, out, sheet);
  }

  // De-dupe (some themes inject identical rules multiple times).
  const uniq = [];
  const seen = new Set();
  for (const item of out) {
    const key = item.selector + "|" + item.style;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(item);
  }

  return { count: uniq.length, samples: uniq.slice(0, 40) };
})();
