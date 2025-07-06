import BlockLinkPlus from "main";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import i18n from "shared/i18n";
import { TFile, MarkdownRenderer } from "obsidian";
import { getLineRangeFromRef } from "shared/utils/obsidian";
import { createRoot } from "react-dom/client";
import { FlowEditorHover } from "basics/flow/FlowEditorHover";
import { EditorView } from "@codemirror/view";
import { FlowEditorInfo } from "basics/codemirror/flowEditor";

const removeLeadingSlash = (path: string) =>
  path.charAt(0) == "/" ? path.substring(1) : path;

const pathToString = (path: string) => {
  if (path.lastIndexOf("/") != -1) {
    if (path.lastIndexOf(".") != -1)
      return removeLeadingSlash(
        path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."))
      );
    return path.substring(path.lastIndexOf("/") + 1);
  }
  if (path.lastIndexOf(".") != -1) {
    return path.substring(0, path.lastIndexOf("."));
  }

  return path;
};
export interface NoteViewProps {
  plugin: BlockLinkPlus;
  source?: string;
  path: string;
  load: boolean;
  properties?: Record<string, any>;
  classname?: string;
  forceNote?: boolean;
  isReadOnly?: boolean;
  view?: EditorView;
  info?: FlowEditorInfo;
}

export const UINote = forwardRef((props: NoteViewProps, ref) => {
  const flowRef = useRef<HTMLDivElement>(null);
  const [existsPas, setExistsPas] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPath = async (force?: boolean) => {
    const div = flowRef.current;
    if (!div) return;

    // Handle read-only mode
    if (props.isReadOnly) {
      // Check if we're already inside a markdown-embed container
      const isAlreadyInEmbed = div.closest('.markdown-embed') !== null;

      if (!isAlreadyInEmbed) {
        // Only add these classes if we're not already in an embed
        div.classList.add("internal-embed", "markdown-embed");
      }

      // Create content container first
      const contentDiv = div.createDiv("markdown-embed-content");
      
      // Create internal link icon (similar to Obsidian native)
      const linkIconContainer = contentDiv.createDiv("markdown-embed-link");
      linkIconContainer.setAttribute("aria-label", "Open link");
      
      // Add link icon SVG
      linkIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
      
      // Add click handler for link with proper multi-line highlighting
      linkIconContainer.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Parse the path to get file and block ID
        const parts = props.path.split('#');
        const filePath = parts[0];
        const blockId = parts[1];
        
        if (filePath && blockId) {
          // Get the line range for multi-line blocks
          const uri = props.plugin.enactor.uriByString(props.path, props.source);
          if (!uri) return;
          
          const file = props.plugin.app.metadataCache.getFirstLinkpathDest(filePath, props.source || "");
          if (!file) return;
          
          const lineRange = getLineRangeFromRef(file.path, blockId ? `#${blockId}` : undefined, props.plugin.app);
          
          // Open the file and navigate to the block with proper highlighting
          const leaf = props.plugin.app.workspace.getLeaf(false);
          await leaf.openFile(file);
          
          // Apply highlighting if we have a valid range
          if (lineRange[0] && lineRange[1] && leaf.view?.editor) {
            const editor = leaf.view.editor;
            const startLine = lineRange[0] - 1;
            const endLine = lineRange[1] - 1;
            
            // Get cursor positions for the line range
            const from = { line: startLine, ch: 0 };
            const to = { line: endLine, ch: editor.getLine(endLine).length };
            
            editor.setSelection(from, to);
            editor.scrollIntoView({ from, to }, true);
          }
        }
      });
      
      // NOTE: Edit icon creation moved to FlowEditorWidget to avoid CodeMirror event management issues
      // The edit icon will be created externally and positioned relative to this widget
      
      // Resolve the path using enactor
      const uri = props.plugin.enactor.uriByString(props.path, props.source);

      if (!uri) {
        contentDiv.innerHTML = `Failed to resolve path: ${props.path}`;
        return;
      }

      // Get file content
      const file = props.plugin.app.vault.getAbstractFileByPath(uri.basePath);

      if (!file || !(file instanceof TFile)) {
        contentDiv.innerHTML = `File not found: ${uri.basePath}`;
        return;
      }

      // Get line range for the block
      const lineRange = getLineRangeFromRef(uri.basePath, uri.refStr, props.plugin.app);
      
      if (!lineRange[0] || !lineRange[1]) {
        contentDiv.innerHTML = `Block not found: ${uri.refStr}`;
        return;
      }

      // Read file content
      const content = await props.plugin.app.vault.read(file);
      const lines = content.split('\n');
      const blockContent = lines.slice(lineRange[0] - 1, lineRange[1]).join('\n');

      // Render content
      await MarkdownRenderer.renderMarkdown(
        blockContent,
        contentDiv,
        uri.basePath,
        props.plugin
      );

      setLoaded(true);
      return;
    }

    const path = props.plugin.enactor.uriByString(props.path, props.source);
    if (!path) {
        setExistsPas(true);
        setLoaded(false);
        return;
    }

    const pathExists = props.plugin.app.vault.getAbstractFileByPath(path.basePath) != null;
    const isFolder = false;
    const filePath =
      isFolder && props.forceNote
        ? path.basePath
        : pathExists
        ? path.fullPath
        : null;

    if (!filePath) {
      if (!force) {
        setExistsPas(true);
        setLoaded(false);
        return;
      } else {
        const parent = path.basePath.split("/").slice(0, -1).join("/");
        if (!parent) return;
        const newPath = await props.plugin.app.vault
          .create(`${parent}/${pathToString(props.path)}.md`, "")
          .then((f) => f.path);
        setExistsPas(false);
        await props.plugin.enactor.openPath(newPath, div);
      }
    } else {
      setExistsPas(false);
      props.plugin.enactor.openPath(filePath, div);
    }

    setLoaded(true);
  };

  const toggleFlow = () => {
    if (props.load) {
      loadPath();
    } else {
      if (flowRef?.current) flowRef.current.innerHTML = "";
    }
  };

  useEffect(() => {
    toggleFlow();
  }, [props.load, props.path]);

  useEffect(() => {
    const reloadFlow = () => {
      if (
        flowRef.current &&
        !flowRef.current.hasChildNodes() &&
        props.load &&
        !existsPas
      ) {
        loadPath();
      }
    };

    return () => {
      // flowRef.current = null;
    };
  }, []);

  return (
    <>
      <div
        className={`${props.classname ?? ""} mk-flowspace-editor`}
        ref={flowRef}
        onClick={(e) => e.stopPropagation()}
      ></div>

      {existsPas ? (
        <div
          onClick={() => loadPath(true)}
          className="mk-placeholder"
          style={{ color: "var(--mk-ui-text-tertiary)" }}
        >
          {i18n.labels.notePlaceholder.replace(
            "${1}",
            pathToString(props.path)
          )}
        </div>
      ) : (
        <></>
      )}
    </>
  );
});
UINote.displayName = "UINote";
