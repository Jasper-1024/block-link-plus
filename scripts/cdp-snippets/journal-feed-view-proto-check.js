// CDP debug: compare WorkspaceLeaf prototypes between workspace leaves and BLP-created detached leaves.
//
// Run:
//   $env:OB_CDP_PORT=9223; $env:OB_CDP_TITLE_CONTAINS='blp'; node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/journal-feed-view-proto-check.js"

(async () => {
  const plugin = window.BlockLinkPlus;
  if (!plugin) throw new Error("window.BlockLinkPlus missing");

  const tmpFolder = "_blp_tmp";
  const filePath = `${tmpFolder}/proto-check.md`;

  try {
    if (!app.vault.getAbstractFileByPath(tmpFolder)) await app.vault.createFolder(tmpFolder);
  } catch {
    // ignore
  }

  let f = app.vault.getAbstractFileByPath(filePath);
  if (!f) f = await app.vault.create(filePath, "# proto-check\n");

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  document.body.appendChild(host);

  const embed = await plugin.inlineEditEngine.leaves.createEmbedLeaf({
    containerEl: host,
    file: f,
    sourcePath: filePath,
  });

  const wsLeaf = app.workspace.getLeaf(false);
  const protoEmbed = Object.getPrototypeOf(embed.leaf);
  const protoWs = Object.getPrototypeOf(wsLeaf);

  const result = {
    embedCtor: protoEmbed?.constructor?.name ?? null,
    wsCtor: protoWs?.constructor?.name ?? null,
    sameProto: protoEmbed === protoWs,
    sameOpen: protoEmbed?.openFile === protoWs?.openFile,
    embedOpenName: protoEmbed?.openFile?.name ?? null,
    wsOpenName: protoWs?.openFile?.name ?? null,
    embedOpenHead: protoEmbed?.openFile ? String(protoEmbed.openFile).slice(0, 140) : null,
    wsOpenHead: protoWs?.openFile ? String(protoWs.openFile).slice(0, 140) : null,
  };

  try {
    plugin.inlineEditEngine.leaves.detach(embed);
  } catch {
    // ignore
  }
  try {
    host.remove();
  } catch {
    // ignore
  }

  return result;
})();

