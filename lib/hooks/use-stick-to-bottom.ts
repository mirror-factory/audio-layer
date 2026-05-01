"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Threshold in CSS pixels for considering the scroll container "at the bottom".
 * Slightly generous so subpixel rounding and rubber-band scrolling do not
 * accidentally drop the user out of sticky mode.
 */
const STICKY_THRESHOLD_PX = 24;

interface UseStickToBottomOptions {
  /**
   * Disable smooth scrolling for users with reduced motion preferences.
   */
  respectReducedMotion?: boolean;
}

interface UseStickToBottomResult {
  /**
   * Attach to the scrolling container element.
   */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Whether the view is currently sticking to the bottom of the scroll
   * container. When `false`, automatic scroll-to-bottom is suppressed and the
   * jump pill should be revealed.
   */
  isAtBottom: boolean;
  /**
   * Whether the user has new content while scrolled away from the bottom and
   * should see the jump pill. Tracks new arrivals via the dependency `signal`.
   */
  hasNewContent: boolean;
  /**
   * Imperatively scroll to the bottom and resume sticky mode. Useful for the
   * jump-to-bottom pill click handler.
   */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /**
   * Pass-through scroll handler for the scrolling container so sticky mode is
   * recomputed as the user scrolls.
   */
  onScroll: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Sticky-to-bottom scroll behavior for chat surfaces and live transcripts.
 *
 * - Auto-scrolls when `signal` changes if the user is at the bottom.
 * - Suspends auto-scroll if the user scrolls away (>{@link STICKY_THRESHOLD_PX}
 *   from the bottom) and exposes `hasNewContent` so a jump pill can be shown.
 * - Resumes sticky mode automatically once the user scrolls within the
 *   threshold of the bottom.
 * - Honors `prefers-reduced-motion` by using `behavior: "auto"`.
 */
export function useStickToBottom<T = unknown>(
  signal: T,
  { respectReducedMotion = true }: UseStickToBottomOptions = {},
): UseStickToBottomResult {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);

  const measure = useCallback((): boolean => {
    const node = scrollRef.current;
    if (!node) return true;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    return distance <= STICKY_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback(
    (behavior?: ScrollBehavior) => {
      const node = scrollRef.current;
      if (!node) return;
      const reduced = respectReducedMotion ? prefersReducedMotion() : false;
      node.scrollTo({
        top: node.scrollHeight,
        behavior: behavior ?? (reduced ? "auto" : "smooth"),
      });
      setIsAtBottom(true);
      setHasNewContent(false);
    },
    [respectReducedMotion],
  );

  const onScroll = useCallback(() => {
    const atBottom = measure();
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewContent(false);
  }, [measure]);

  // Auto-scroll on signal change when sticky.
  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    if (isAtBottom) {
      scrollToBottom();
    } else {
      setHasNewContent(true);
    }
    // We intentionally only react to `signal` here. `isAtBottom` is a stable
    // boolean derived from user gestures and would otherwise re-fire scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);

  // Re-measure when the container resizes (e.g. mobile keyboard, layout shifts).
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (isAtBottom) scrollToBottom("auto");
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isAtBottom, scrollToBottom]);

  return {
    scrollRef,
    isAtBottom,
    hasNewContent,
    scrollToBottom,
    onScroll,
  };
}

export const STICK_TO_BOTTOM_THRESHOLD = STICKY_THRESHOLD_PX;
