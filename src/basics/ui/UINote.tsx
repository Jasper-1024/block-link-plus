import BlockLinkPlus from "main";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import i18n from "shared/i18n";

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
}

export const UINote = forwardRef((props: NoteViewProps, ref) => {
  const flowRef = useRef<HTMLDivElement>(null);
  const [existsPas, setExistsPas] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPath = async (force?: boolean) => {
    const div = flowRef.current;
    if (!div) return;

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
