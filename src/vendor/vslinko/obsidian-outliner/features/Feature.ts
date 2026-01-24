// @ts-nocheck
export interface Feature {
  load(): Promise<void>;
  unload(): Promise<void>;
}
