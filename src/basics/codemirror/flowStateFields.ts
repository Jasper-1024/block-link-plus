import { Annotation, StateField } from "@codemirror/state";
import { PortalType } from "../flow/PortalType";

export const portalTypeAnnotation = Annotation.define<PortalType>();
export const flowIDAnnotation = Annotation.define<string>();
export const flowIDStateField = StateField.define<string | undefined>({
  create: () => undefined,
  update(value, tr) {
    if (tr.annotation(flowIDAnnotation)) return tr.annotation(flowIDAnnotation);
    return value;
  },
});

export const flowTypeStateField = StateField.define<PortalType>({
  create: (state) => "none",
  update(value, tr) {
    const nextType = tr.annotation(portalTypeAnnotation);
    if (nextType !== undefined) return nextType;
    return value;
  },
});
