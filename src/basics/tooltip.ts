import {
  EditorState,
  Extension,
  Facet,
  StateEffect,
  StateEffectType,
  StateField
} from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  logException
} from "@codemirror/view";

/**
 * Simplified Codemirror tooltip system
 * Only includes hoverTooltip functionality
 **/

type Rect = { left: number; right: number; top: number; bottom: number };

const Outside = "-10000px";

/// Describes a tooltip.
export interface Tooltip {
  /// The document position at which to show the tooltip.
  pos: number;
  /// The end of the range annotated by this tooltip, if different
  /// from `pos`.
  end?: number;
  /// A constructor function that creates the tooltip's DOM representation.
  create(view: EditorView): TooltipView;
  /// Whether the tooltip should be shown above or below the target position.
  above?: boolean;
}

/// Objects returned by tooltip view constructors.
export interface TooltipView {
  /// The DOM element to position over the editor.
  dom: HTMLElement;
  /// Adjust the position of the tooltip relative to its anchor position.
  offset?: { x: number; y: number };
  /// Called after the tooltip is added to the DOM for the first time.
  mount?(view: EditorView): void;
  /// Update the DOM element for a change in the view's state.
  update?(update: ViewUpdate): void;
}

const showTooltip = Facet.define<Tooltip | null>();

/// Return an extension that configures tooltip behavior.
/// Simplified version - configuration is handled internally.
export function tooltips(
  config: {
    /// The element to put the tooltips into.
    parent?: HTMLElement;
  } = {}
): Extension {
  // Return empty extension since tooltip functionality is now self-contained
  return [];
}

const tooltipPlugin = ViewPlugin.fromClass(
  class {
    tooltips: readonly Tooltip[];
    tooltipViews: readonly TooltipView[];
    container: HTMLElement;

    constructor(readonly view: EditorView) {
      this.tooltips = view.state.facet(showTooltip).filter((t) => t) as Tooltip[];
      this.tooltipViews = this.tooltips.map(t => this.createTooltip(t));
      this.container = view.dom.appendChild(document.createElement("div"));
      this.container.className = "cm-tooltip-container";
      this.container.style.position = "absolute";
      this.container.style.top = Outside;
    }

    update(update: ViewUpdate) {
      const tooltips = update.state.facet(showTooltip).filter((t) => t) as Tooltip[];
      
      if (tooltips.length !== this.tooltips.length || 
          tooltips.some((t, i) => t !== this.tooltips[i])) {
        
        // Remove old tooltips
        for (const view of this.tooltipViews) {
          view.dom.remove();
        }
        
        // Create new tooltips
        this.tooltips = tooltips;
        this.tooltipViews = tooltips.map(t => this.createTooltip(t));
        this.position();
      } else {
        // Update existing tooltips
        for (const view of this.tooltipViews) {
          if (view.update) view.update(update);
        }
      }
    }

    createTooltip(tooltip: Tooltip): TooltipView {
      const tooltipView = tooltip.create(this.view);
      tooltipView.dom.className = "cm-tooltip";
      this.container.appendChild(tooltipView.dom);
      if (tooltipView.mount) tooltipView.mount(this.view);
      return tooltipView;
    }

    position() {
      if (this.tooltips.length === 0) return;
      
      const tooltip = this.tooltips[0];
      const view = this.tooltipViews[0];
      
      try {
        const pos = this.view.coordsAtPos(tooltip.pos);
        if (!pos) return;
        
        const container = this.container;
        const offset = view.offset || { x: 0, y: 0 };
        
        container.style.left = (pos.left + offset.x) + "px";
        container.style.top = (tooltip.above ? pos.top - 30 : pos.bottom + 5) + offset.y + "px";
      } catch (e) {
        logException(this.view.state, e);
      }
    }

    destroy() {
      this.container.remove();
    }
  },
  {
    eventHandlers: {
      scroll() { this.position(); },
      resize() { this.position(); }
    }
  }
);

// Hover tooltip implementation
const showHoverTooltip = Facet.define<Tooltip | null>();

class HoverTooltipHost implements TooltipView {
  dom: HTMLElement;
  mounted = false;

  static create(view: EditorView) {
    return new HoverTooltipHost(view);
  }

  private constructor(readonly view: EditorView) {
    this.dom = document.createElement("div");
    this.dom.className = "cm-tooltip-hover";
  }

  mount(view: EditorView) {
    this.mounted = true;
  }

  update(update: ViewUpdate) {
    const tooltips = update.state.facet(showHoverTooltip).filter((t) => t) as Tooltip[];
    
    // Clear existing content
    this.dom.innerHTML = "";
    
    // Add new tooltip content
    for (const tooltip of tooltips) {
      const tooltipView = tooltip.create(this.view);
      this.dom.appendChild(tooltipView.dom);
      if (tooltipView.mount && this.mounted) tooltipView.mount(this.view);
    }
  }
}

const showHoverTooltipHost = showTooltip.compute(
  [showHoverTooltip],
  (state) => {
    const tooltips = state.facet(showHoverTooltip).filter((t) => t) as Tooltip[];
    if (tooltips.length === 0) return null;
    
    return {
      pos: tooltips[0].pos,
      end: tooltips[0].end,
      create: HoverTooltipHost.create,
      above: tooltips[0].above,
    };
  }
);

const enum Hover {
  Time = 300,
  MaxDist = 6,
}

class HoverPlugin {
  lastMove: { x: number; y: number; target: HTMLElement; time: number };
  hoverTimeout: any = -1;
  pending: { pos: number } | null = null;

  constructor(
    readonly view: EditorView,
    readonly source: (
      view: EditorView,
      pos: number,
      side: -1 | 1
    ) => Tooltip | null | Promise<Tooltip | null>,
    readonly field: StateField<Tooltip | null>,
    readonly setHover: StateEffectType<Tooltip | null>,
    readonly hoverTime: number
  ) {
    this.lastMove = { x: 0, y: 0, target: view.dom, time: 0 };
    
    view.dom.addEventListener("mousemove", this.mousemove.bind(this));
    view.dom.addEventListener("mouseleave", this.mouseleave.bind(this));
  }

  get active() {
    return this.view.state.field(this.field);
  }

  checkHover() {
    this.hoverTimeout = -1;
    if (this.pending) {
      const { pos } = this.pending;
      this.pending = null;
      this.startHover(pos);
    }
  }

  startHover(pos: number) {
    const side = pos < this.view.state.doc.length ? 1 : -1;
    const result = this.source(this.view, pos, side);
    
    if (result instanceof Promise) {
      result.then(tooltip => {
        if (tooltip) {
          this.view.dispatch({ effects: this.setHover.of(tooltip) });
        }
      });
    } else if (result) {
      this.view.dispatch({ effects: this.setHover.of(result) });
    }
  }

  mousemove(event: MouseEvent) {
    this.lastMove = { 
      x: event.clientX, 
      y: event.clientY, 
      target: event.target as HTMLElement, 
      time: Date.now() 
    };
    
    if (this.hoverTimeout < 0) {
      this.hoverTimeout = setTimeout(() => this.checkHover(), this.hoverTime);
    }
    
    const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos != null) {
      this.pending = { pos };
    }
  }

  mouseleave() {
    if (this.hoverTimeout >= 0) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = -1;
    }
    this.pending = null;
    if (this.active) {
      this.view.dispatch({ effects: this.setHover.of(null) });
    }
  }

  destroy() {
    if (this.hoverTimeout >= 0) clearTimeout(this.hoverTimeout);
  }
}

/// Enable a hover tooltip, which shows up when the pointer hovers
/// over ranges of text. The callback should return a tooltip
/// description or null if no tooltip should be shown.
export function hoverTooltip(
  source: (
    view: EditorView,
    pos: number,
    side: -1 | 1
  ) => Tooltip | null | Promise<Tooltip | null>,
  options: {
    /// Hover time after which the tooltip should appear, in milliseconds.
    hoverTime?: number;
  } = {}
): Extension {
  const setHover = StateEffect.define<Tooltip | null>();
  const hoverState = StateField.define<Tooltip | null>({
    create() { return null; },
    
    update(value, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setHover)) return effect.value;
      }
      return value;
    },
    
    provide: (f) => showHoverTooltip.from(f),
  });

  return [
    hoverState,
    ViewPlugin.define(view => new HoverPlugin(
      view, source, hoverState, setHover, options.hoverTime ?? Hover.Time
    )),
    showHoverTooltipHost,
    tooltipPlugin,
  ];
}
