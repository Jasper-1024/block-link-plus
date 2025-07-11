import { Root } from "react-dom/client";
import { SelectOption } from "shared/types/menu";
import { URI } from "shared/types/path";
import { SpaceFragmentSchema } from "shared/types/spaceFragment";

export interface Enactor {
    name: string;
    load(): void;
    loadExtensions(firstLoad: boolean): void;
    uriByString(uri: string, source?: string): any;
    openPath(path: string, source?: HTMLElement, isReadOnly?: boolean): void;
}

