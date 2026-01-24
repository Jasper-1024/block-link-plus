import { Editor } from "obsidian";
import type BlockLinkPlus from "../../main";
import { isThirdPartyPluginEnabled, syncBuiltInEnabledSettingWithExternalConflict } from "./gating";

import { setBuiltInOutlinerEnabled } from "../../vendor/vslinko/obsidian-outliner/integration/enabled";
import type { Feature as OutlinerFeature } from "../../vendor/vslinko/obsidian-outliner/features/Feature";
import { ArrowLeftAndCtrlArrowLeftBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/ArrowLeftAndCtrlArrowLeftBehaviourOverride";
import { BackspaceBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/BackspaceBehaviourOverride";
import { BetterListsStyles } from "../../vendor/vslinko/obsidian-outliner/features/BetterListsStyles";
import { CtrlAAndCmdABehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/CtrlAAndCmdABehaviourOverride";
import { DeleteBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/DeleteBehaviourOverride";
import { DragAndDrop } from "../../vendor/vslinko/obsidian-outliner/features/DragAndDrop";
import { EditorSelectionsBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/EditorSelectionsBehaviourOverride";
import { EnterBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/EnterBehaviourOverride";
import { ListsFoldingCommands } from "../../vendor/vslinko/obsidian-outliner/features/ListsFoldingCommands";
import { ListsMovementCommands } from "../../vendor/vslinko/obsidian-outliner/features/ListsMovementCommands";
import { MetaBackspaceBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/MetaBackspaceBehaviourOverride";
import { ShiftTabBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/ShiftTabBehaviourOverride";
import { SystemInfo } from "../../vendor/vslinko/obsidian-outliner/features/SystemInfo";
import { TabBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/TabBehaviourOverride";
import { VerticalLines } from "../../vendor/vslinko/obsidian-outliner/features/VerticalLines";
import { VimOBehaviourOverride } from "../../vendor/vslinko/obsidian-outliner/features/VimOBehaviourOverride";
import { ChangesApplicator } from "../../vendor/vslinko/obsidian-outliner/services/ChangesApplicator";
import { IMEDetector } from "../../vendor/vslinko/obsidian-outliner/services/IMEDetector";
import { Logger } from "../../vendor/vslinko/obsidian-outliner/services/Logger";
import { ObsidianSettings as OutlinerObsidianSettings } from "../../vendor/vslinko/obsidian-outliner/services/ObsidianSettings";
import { OperationPerformer } from "../../vendor/vslinko/obsidian-outliner/services/OperationPerformer";
import { Parser } from "../../vendor/vslinko/obsidian-outliner/services/Parser";
import { Settings as OutlinerSettings, type Storage as OutlinerStorage } from "../../vendor/vslinko/obsidian-outliner/services/Settings";

import { setBuiltInZoomEnabled } from "../../vendor/vslinko/obsidian-zoom/integration/enabled";
import type { Feature as ZoomFeatureType } from "../../vendor/vslinko/obsidian-zoom/features/Feature";
import { HeaderNavigationFeature } from "../../vendor/vslinko/obsidian-zoom/features/HeaderNavigationFeature";
import { LimitSelectionFeature } from "../../vendor/vslinko/obsidian-zoom/features/LimitSelectionFeature";
import { ListsStylesFeature } from "../../vendor/vslinko/obsidian-zoom/features/ListsStylesFeature";
import { ResetZoomWhenVisibleContentBoundariesViolatedFeature } from "../../vendor/vslinko/obsidian-zoom/features/ResetZoomWhenVisibleContentBoundariesViolatedFeature";
import { ZoomFeature } from "../../vendor/vslinko/obsidian-zoom/features/ZoomFeature";
import { ZoomOnClickFeature } from "../../vendor/vslinko/obsidian-zoom/features/ZoomOnClickFeature";
import { LoggerService } from "../../vendor/vslinko/obsidian-zoom/services/LoggerService";
import { SettingsService, type Storage as ZoomStorage } from "../../vendor/vslinko/obsidian-zoom/services/SettingsService";
import { getEditorViewFromEditor } from "../../vendor/vslinko/obsidian-zoom/utils/getEditorViewFromEditor";
import { createBuiltInVslinkoScopeExtension } from "./scope-extension";

class BuiltInOutlinerSettingsStorage implements OutlinerStorage {
  constructor(private plugin: BlockLinkPlus) {}

  async loadData() {
    return this.plugin.settings.builtInObsidianOutlinerSettings ?? {};
  }

  async saveData(settings: any) {
    this.plugin.settings.builtInObsidianOutlinerSettings = settings;
    await this.plugin.saveSettings();
  }
}

class BuiltInZoomSettingsStorage implements ZoomStorage {
  constructor(private plugin: BlockLinkPlus) {}

  async loadData() {
    return this.plugin.settings.builtInObsidianZoomSettings ?? {};
  }

  async saveData(settings: any) {
    this.plugin.settings.builtInObsidianZoomSettings = settings;
    await this.plugin.saveSettings();
  }
}

class BuiltInZoomGlobalApi {
  public readonly __blpBuiltIn = true;

  constructor(private zoomFeature: ZoomFeature) {}

  public getZoomRange(editor: Editor) {
    const cm = getEditorViewFromEditor(editor);
    const range = this.zoomFeature.calculateVisibleContentRange(cm.state);

    if (!range) return null;

    const from = cm.state.doc.lineAt(range.from);
    const to = cm.state.doc.lineAt(range.to);

    return {
      from: {
        line: from.number - 1,
        ch: range.from - from.from,
      },
      to: {
        line: to.number - 1,
        ch: range.to - to.from,
      },
    };
  }

  public zoomOut(editor: Editor) {
    this.zoomFeature.zoomOut(getEditorViewFromEditor(editor));
  }

  public zoomIn(editor: Editor, line: number) {
    const cm = getEditorViewFromEditor(editor);
    const pos = cm.state.doc.line(line + 1).from;
    this.zoomFeature.zoomIn(cm, pos);
  }

  public refreshZoom(editor: Editor) {
    this.zoomFeature.refreshZoom(getEditorViewFromEditor(editor));
  }
}

class BuiltInOutlinerModule {
  private settings: OutlinerSettings | null = null;
  private imeDetector: IMEDetector | null = null;
  private features: OutlinerFeature[] = [];

  constructor(private plugin: BlockLinkPlus) {}

  async load() {
    const settings = new OutlinerSettings(new BuiltInOutlinerSettingsStorage(this.plugin));
    await settings.load();
    this.settings = settings;

    const obsidianSettings = new OutlinerObsidianSettings(this.plugin.app);
    const logger = new Logger(settings);
    const parser = new Parser(logger, settings);
    const changesApplicator = new ChangesApplicator();
    const operationPerformer = new OperationPerformer(parser, changesApplicator);

    const imeDetector = new IMEDetector();
    await imeDetector.load();
    this.imeDetector = imeDetector;

    this.features = [
      new SystemInfo(this.plugin, settings),
      new ListsMovementCommands(this.plugin, obsidianSettings, operationPerformer),
      new ListsFoldingCommands(this.plugin, obsidianSettings),
      new EditorSelectionsBehaviourOverride(this.plugin, settings, parser, operationPerformer),
      new ArrowLeftAndCtrlArrowLeftBehaviourOverride(this.plugin, settings, imeDetector, operationPerformer),
      new BackspaceBehaviourOverride(this.plugin, settings, imeDetector, operationPerformer),
      new MetaBackspaceBehaviourOverride(this.plugin, settings, imeDetector, operationPerformer),
      new DeleteBehaviourOverride(this.plugin, settings, imeDetector, operationPerformer),
      new TabBehaviourOverride(this.plugin, imeDetector, obsidianSettings, settings, operationPerformer),
      new ShiftTabBehaviourOverride(this.plugin, imeDetector, settings, operationPerformer),
      new EnterBehaviourOverride(this.plugin, settings, imeDetector, obsidianSettings, parser, operationPerformer),
      new VimOBehaviourOverride(this.plugin, settings, obsidianSettings, parser, operationPerformer),
      new CtrlAAndCmdABehaviourOverride(this.plugin, settings, imeDetector, operationPerformer),
      new BetterListsStyles(settings, obsidianSettings),
      new VerticalLines(this.plugin, settings, obsidianSettings, parser),
      new DragAndDrop(this.plugin, settings, obsidianSettings, parser, operationPerformer),
    ];

    this.syncEnabledState({ showNotice: false });

    for (const feature of this.features) {
      await feature.load();
    }
  }

  syncEnabledState(options: { showNotice: boolean }) {
    if (!this.settings) return;

    const { desiredEnabled: desired } = syncBuiltInEnabledSettingWithExternalConflict({
      plugin: this.plugin as any,
      externalPluginId: "obsidian-outliner",
      settingsFlagKey: "builtInObsidianOutlinerEnabled",
      showNotice: options.showNotice,
      noticeText: "Block Link Plus: Built-in Outliner is disabled because external plugin 'obsidian-outliner' is enabled.",
    });

    this.settings.setEnabled(desired);
    setBuiltInOutlinerEnabled(desired);
  }

  async unload() {
    if (this.imeDetector) {
      await this.imeDetector.unload();
      this.imeDetector = null;
    }

    for (const feature of this.features) {
      await feature.unload();
    }

    this.features = [];
    this.settings = null;
  }

  getSettings(): OutlinerSettings | null {
    return this.settings;
  }
}

class BuiltInZoomModule {
  private settings: SettingsService | null = null;
  private features: ZoomFeatureType[] = [];
  private zoomFeature: ZoomFeature | null = null;
  private globalApi: BuiltInZoomGlobalApi | null = null;
  private lastEnabled: boolean | null = null;

  constructor(private plugin: BlockLinkPlus) {}

  async load() {
    const settings = new SettingsService(new BuiltInZoomSettingsStorage(this.plugin));
    await settings.load();
    this.settings = settings;

    const logger = new LoggerService(settings);
    const zoomFeature = new ZoomFeature(this.plugin, logger);
    this.zoomFeature = zoomFeature;

    this.features = [
      zoomFeature,
      new LimitSelectionFeature(this.plugin, logger, zoomFeature),
      new ResetZoomWhenVisibleContentBoundariesViolatedFeature(this.plugin, logger, zoomFeature, zoomFeature),
      new HeaderNavigationFeature(
        this.plugin,
        logger,
        zoomFeature,
        zoomFeature,
        zoomFeature,
        zoomFeature,
        zoomFeature,
        zoomFeature,
      ),
      new ZoomOnClickFeature(this.plugin, settings, zoomFeature),
      new ListsStylesFeature(settings),
    ];

    this.syncEnabledState({ showNotice: false });

    for (const feature of this.features) {
      await feature.load();
    }
  }

  private updateGlobalApi(enabled: boolean) {
    const w = window as any;
    const existing = w.ObsidianZoomPlugin;

    if (!enabled) {
      if (existing && existing.__blpBuiltIn === true) {
        delete w.ObsidianZoomPlugin;
      }
      return;
    }

    // If external plugin is enabled, do not override its global.
    if (isThirdPartyPluginEnabled(this.plugin, "obsidian-zoom")) return;

    if (!this.zoomFeature) return;

    if (!this.globalApi) {
      this.globalApi = new BuiltInZoomGlobalApi(this.zoomFeature);
    }
    w.ObsidianZoomPlugin = this.globalApi;
  }

  syncEnabledState(options: { showNotice: boolean }) {
    if (!this.settings) return;

    const { desiredEnabled: desired } = syncBuiltInEnabledSettingWithExternalConflict({
      plugin: this.plugin as any,
      externalPluginId: "obsidian-zoom",
      settingsFlagKey: "builtInObsidianZoomEnabled",
      showNotice: options.showNotice,
      noticeText: "Block Link Plus: Built-in Zoom is disabled because external plugin 'obsidian-zoom' is enabled.",
    });

    if (this.lastEnabled === true && desired === false) {
      this.zoomOutAllOpenEditors();
    }

    this.lastEnabled = desired;
    this.settings.setEnabled(desired);
    setBuiltInZoomEnabled(desired);
    this.updateGlobalApi(desired);
  }

  private zoomOutAllOpenEditors() {
    if (!this.zoomFeature) return;

    const leaves = (this.plugin.app.workspace as any)?.getLeavesOfType?.("markdown") ?? [];
    for (const leaf of leaves) {
      const view = (leaf as any)?.view;
      const editor = view?.editor;
      if (!editor) continue;

      try {
        this.zoomFeature.zoomOut(getEditorViewFromEditor(editor));
      } catch {
        // ignore - best effort
      }
    }
  }

  async unload() {
    this.updateGlobalApi(false);

    for (const feature of this.features) {
      await feature.unload();
    }

    this.features = [];
    this.zoomFeature = null;
    this.settings = null;
    this.globalApi = null;
  }

  getSettings(): SettingsService | null {
    return this.settings;
  }
}

export class BuiltInVslinkoManager {
  private outliner: BuiltInOutlinerModule | null = null;
  private zoom: BuiltInZoomModule | null = null;

  constructor(private plugin: BlockLinkPlus) {}

  async load() {
    // Mark which CM editors are in-scope for vendored list UX (global or Enhanced List scoped).
    this.plugin.registerEditorExtension([createBuiltInVslinkoScopeExtension(this.plugin)]);

    this.outliner = new BuiltInOutlinerModule(this.plugin);
    await this.outliner.load();

    this.zoom = new BuiltInZoomModule(this.plugin);
    await this.zoom.load();

    this.onSettingsChanged(false);
  }

  onSettingsChanged(showNotice = true) {
    this.outliner?.syncEnabledState({ showNotice });
    this.zoom?.syncEnabledState({ showNotice });
  }

  async unload() {
    if (this.zoom) {
      await this.zoom.unload();
      this.zoom = null;
    }
    if (this.outliner) {
      await this.outliner.unload();
      this.outliner = null;
    }
  }

  getOutlinerSettings(): OutlinerSettings | null {
    return this.outliner?.getSettings() ?? null;
  }

  getZoomSettings(): SettingsService | null {
    return this.zoom?.getSettings() ?? null;
  }
}
