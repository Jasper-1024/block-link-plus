// @ts-nocheck
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { isBulletPoint } from "./utils/isBulletPoint";

import { SettingsService } from "../services/SettingsService";
import { isEditorViewInBlpVslinkoScope } from "../../blp-scope";

export interface ClickOnBullet {
  clickOnBullet(view: EditorView, pos: number): void;
}

export class DetectClickOnBullet {
  constructor(
    private settings: SettingsService,
    private clickOnBullet: ClickOnBullet
  ) {}

  getExtension() {
    return EditorView.domEventHandlers({
      click: this.detectClickOnBullet,
    });
  }

  public moveCursorToLineEnd(view: EditorView, pos: number) {
    const line = view.state.doc.lineAt(pos);

    view.dispatch({
      selection: EditorSelection.cursor(line.to),
    });
  }

  private detectClickOnBullet = (e: MouseEvent, view: EditorView) => {
    if (
      !this.settings.zoomOnClick ||
      !(e.target instanceof HTMLElement) ||
      !isBulletPoint(e.target)
    ) {
      return;
    }

    if (!isEditorViewInBlpVslinkoScope(view)) {
      return;
    }

    // Block Link Plus Enhanced List can take over bullet clicks (fold/menu/block selection).
    // When it does, do not also trigger zoom-on-click.
    const blp = (window as any).BlockLinkPlus;
    const handleActionsEnabled = Boolean(blp?.settings?.enhancedListHandleActions);
    const clickAction = String(blp?.settings?.enhancedListHandleClickAction ?? "toggle-folding");
    if (handleActionsEnabled && clickAction !== "none") {
      return;
    }

    const pos = view.posAtDOM(e.target);
    this.clickOnBullet.clickOnBullet(view, pos);
  };
}
