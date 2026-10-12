import type { ComponentType } from "react";
import { HoverCardDemo, TooltipDemo, ScrubbyDemo, PopupSliderDemo, SpringMenuDemo, DragReorderDemo, LongPressDemo, SwipeDismissDemo, ContextMenuDemo } from "./pointer";
import { ToastDemo, SkeletonDemo, ProgressDemo, OptimisticDemo, TogglesDemo, InlineEditDemo, DebounceThrottleDemo } from "./feedback";
import { FocusTrapDemo, BottomSheetDemo, AccordionDemo, InfiniteScrollDemo, VirtualListDemo, CommandPaletteDemo, EasingDemo } from "./layout";
import { BeforeAfterDemo, OnionSkinDemo, SideBySideDemo, HoldCompareDemo, LoupeDemo, PixelDiffDemo } from "./compare";
import { terms } from "../data/terms";

const commandNames = terms.map((t) => `${t.name} (${t.en})`);

export const demos: Record<string, ComponentType> = {
  hoverCard: HoverCardDemo,
  tooltip: TooltipDemo,
  scrubby: ScrubbyDemo,
  popupSlider: PopupSliderDemo,
  springMenu: SpringMenuDemo,
  dragReorder: DragReorderDemo,
  longPress: LongPressDemo,
  swipeDismiss: SwipeDismissDemo,
  contextMenu: ContextMenuDemo,
  toast: ToastDemo,
  skeleton: SkeletonDemo,
  progress: ProgressDemo,
  optimistic: OptimisticDemo,
  toggles: TogglesDemo,
  inlineEdit: InlineEditDemo,
  debounceThrottle: DebounceThrottleDemo,
  focusTrap: FocusTrapDemo,
  bottomSheet: BottomSheetDemo,
  accordion: AccordionDemo,
  infiniteScroll: InfiniteScrollDemo,
  virtualList: VirtualListDemo,
  commandPalette: () => <CommandPaletteDemo commands={commandNames} />,
  easing: EasingDemo,
  beforeAfter: BeforeAfterDemo,
  onionSkin: OnionSkinDemo,
  sideBySide: SideBySideDemo,
  holdCompare: HoldCompareDemo,
  loupe: LoupeDemo,
  pixelDiff: PixelDiffDemo,
};
