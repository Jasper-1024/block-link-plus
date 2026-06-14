(() => {
  function walk(rules, out, sheet) {
    if (!rules) return;

    for (const rule of Array.from(rules)) {
      // STYLE_RULE
      if (rule.type === 1) {
        const sel = rule.selectorText || "";
        if (sel.includes("::selection") || sel.includes("::-moz-selection")) {
          out.push({
            sheet: sheet.href || "inline",
            selector: sel,
            style: rule.style ? rule.style.cssText : "",
          });
        }
        continue;
      }

      // MEDIA_RULE / SUPPORTS_RULE / LAYER_BLOCK_RULE etc.
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

  return { count: out.length, samples: out.slice(0, 30) };
})();
