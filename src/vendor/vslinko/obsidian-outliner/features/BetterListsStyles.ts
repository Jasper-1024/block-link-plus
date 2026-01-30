// @ts-nocheck
import { Feature } from "./Feature";

import { ObsidianSettings } from "../services/ObsidianSettings";
import { Settings } from "../services/Settings";

const BETTER_LISTS_BODY_CLASS = "outliner-plugin-better-lists";

export class BetterListsStyles implements Feature {
  private settingsChangeHandler: (() => void) | null = null;

  constructor(
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
  ) {}

  async load() {
    this.updateBodyClass();
    // Avoid polling; Settings already has onChange callbacks.
    this.settingsChangeHandler = () => this.updateBodyClass();
    this.settings.onChange(this.settingsChangeHandler);
  }

  async unload() {
    if (this.settingsChangeHandler) {
      this.settings.removeCallback(this.settingsChangeHandler);
      this.settingsChangeHandler = null;
    }
    document.body.classList.remove(BETTER_LISTS_BODY_CLASS);
  }

  private updateBodyClass = () => {
    const shouldExists = this.settings.betterListsStyles;
    const exists = document.body.classList.contains(BETTER_LISTS_BODY_CLASS);

    if (shouldExists && !exists) {
      document.body.classList.add(BETTER_LISTS_BODY_CLASS);
    }

    if (!shouldExists && exists) {
      document.body.classList.remove(BETTER_LISTS_BODY_CLASS);
    }
  };
}
