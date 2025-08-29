// Modified from https://gist.github.com/janis-me/1a55a8747f12e1c4fc86ebe2d05a0a55
import { Box, type BoxProps, type DOMElement, measureElement, useFocus, useInput } from "ink";
import React, { useEffect, useLayoutEffect, useReducer, useRef } from "react";

interface ScrollAreaState {
  innerRef: React.RefObject<DOMElement | null>;
  innerHeight: number;
  height: number;
  scrollTop: number;
}

type ScrollAreaAction =
  | { type: "SET_INNER_HEIGHT"; innerHeight: number }
  | { type: "SET_HEIGHT"; height: number }
  | { type: "SCROLL_DOWN" }
  | { type: "SCROLL_UP" };

const reducer = (state: ScrollAreaState, action: ScrollAreaAction) => {
  // Always derive limits from state to keep reducer pure and predictable.
  const innerHeight = state.innerHeight;
  const maxScroll = Math.max(0, innerHeight - state.height);
  switch (action.type) {
    case "SET_INNER_HEIGHT": {
      const prevMaxScroll = Math.max(0, state.innerHeight - state.height);
      const nextInnerHeight = action.innerHeight;
      const nextMaxScroll = Math.max(0, nextInnerHeight - state.height);
      const wasPinnedToBottom = state.scrollTop >= prevMaxScroll;

      return {
        ...state,
        innerHeight: nextInnerHeight,
        scrollTop: wasPinnedToBottom ? nextMaxScroll : Math.min(state.scrollTop, nextMaxScroll),
      };
    }

    case "SET_HEIGHT": {
      const prevMaxScroll = Math.max(0, state.innerHeight - state.height);
      const nextHeight = action.height;
      const nextMaxScroll = Math.max(0, state.innerHeight - nextHeight);
      const wasPinnedToBottom = state.scrollTop >= prevMaxScroll;

      return {
        ...state,
        height: nextHeight,
        scrollTop: wasPinnedToBottom ? nextMaxScroll : Math.min(state.scrollTop, nextMaxScroll),
      };
    }

    case "SCROLL_DOWN":
      return {
        ...state,
        scrollTop: Math.min(maxScroll, state.scrollTop + 1),
      };

    case "SCROLL_UP":
      return {
        ...state,
        scrollTop: Math.max(0, state.scrollTop - 1),
      };

    default:
      return state;
  }
};

export type ScrollAreaProps = React.PropsWithChildren &
  Omit<BoxProps, "overflow" | "flexDirection" | "height"> & {
    height: number;
  };

export const ScrollArea = ({ height, children, ...boxProps }: ScrollAreaProps) => {
  useFocus();
  const innerRef = useRef<DOMElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    height: height,
    innerHeight: 0,
    scrollTop: 0,
    innerRef,
  });

  useEffect(() => {
    dispatch({ type: "SET_HEIGHT", height });
  }, [height]);

  // Measure inner content height on content changes and update; if user was pinned to bottom, stay pinned.
  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const { height: measuredInnerHeight } = measureElement(innerRef.current);
    dispatch({ type: "SET_INNER_HEIGHT", innerHeight: measuredInnerHeight });
    // Re-run when children change (content grows/shrinks) or container height changes
  }, [children, height]);

  useInput((_, key) => {
    if (key.downArrow) {
      dispatch({
        type: "SCROLL_DOWN",
      });
    }

    if (key.upArrow) {
      dispatch({
        type: "SCROLL_UP",
      });
    }
  });

  return (
    <Box height={height} {...boxProps} flexDirection="column" overflow="hidden">
      <Box ref={innerRef} flexShrink={0} flexDirection="column" marginTop={-state.scrollTop}>
        {children}
      </Box>
    </Box>
  );
};
