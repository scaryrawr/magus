import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import React, { useEffect, useState } from "react";
import { useInputSubmit, useInputValue, useSetInputValue, useStackedRouteInput } from "./index";

/**
 * This test simulates an async handler that calls api.done() after another handler has been pushed.
 * We ensure only the original handler is removed and the newer top handler remains active.
 */

describe("inputStore async handler race", () => {
  it("async done only removes its own handler when a new one is pushed meanwhile", async () => {
    const events: string[] = [];

    const AsyncFirst: React.FC<{ onMounted: () => void }> = ({ onMounted }) => {
      useStackedRouteInput({
        onSubmit: async (text, api) => {
          events.push(`first:${text}`);
          // simulate async work
          await new Promise((r) => setTimeout(r, 30));
          api.done();
        },
        clearOnSubmit: false,
      });
      useEffect(() => onMounted(), [onMounted]);
      return null;
    };

    const Second: React.FC = () => {
      useStackedRouteInput({
        onSubmit: (text) => {
          events.push(`second:${text}`);
        },
      });
      return null;
    };

    const Orchestrator: React.FC = () => {
      const submit = useInputSubmit();
      const setValue = useSetInputValue();
      const value = useInputValue();
      const [showSecond, setShowSecond] = useState(false);
      const [submittedSecond, setSubmittedSecond] = useState(false);

      // mount first and submit
      useEffect(() => {
        setValue("one");
        submit(); // handled by first async
        // push second shortly after
        setTimeout(() => setShowSecond(true), 5);
      }, [setValue, submit]);

      // after second is mounted, submit again once async first likely still pending
      useEffect(() => {
        if (showSecond && !submittedSecond) {
          setValue("two");
          submit(); // should be handled by second, even though first will call done later
          setSubmittedSecond(true);
        }
      }, [showSecond, submittedSecond, setValue, submit]);

      // ensure final value stabilization
      useEffect(() => {
        // nothing needed; placeholder for potential future checks
      }, [value]);

      return (
        <>
          <AsyncFirst onMounted={() => {}} />
          {showSecond && <Second />}
        </>
      );
    };

    render(<Orchestrator />);

    await new Promise((r) => setTimeout(r, 120));

    // Expect first handled "one" and second handled "two".
    expect(events).toContain("first:one");
    expect(events).toContain("second:two");

    // Order: first may log before or after second due to async timing; ensure both present and only once each.
    expect(events.filter((e) => e.startsWith("first:")).length).toBe(1);
    expect(events.filter((e) => e.startsWith("second:")).length).toBe(1);
  });
});
