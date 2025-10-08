import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import React, { useEffect, useState } from "react";
import { useInputSubmit, useInputValue, useSetInputValue, useStackedRouteInput } from "./inputStore";

/**
 * Handler stack behavior tests:
 * - A temporary (picker) handler can inject text then pop itself via api.done()
 * - After it pops, the previous (base) handler becomes active
 * - clearOnSubmit semantics respected for each handler
 */

describe("inputStore handler stack", () => {
  it("picker handler injects then base handler receives injected text after pop", async () => {
    const baseCalls: string[] = [];
    const pickerCalls: string[] = [];

    const Base: React.FC = () => {
      useStackedRouteInput({
        onSubmit: (text) => {
          baseCalls.push(text);
        },
        clearOnSubmit: true,
      });
      return null;
    };

    const Picker: React.FC<{ onDone: () => void }> = ({ onDone }) => {
      useStackedRouteInput({
        onSubmit: (text, api) => {
          pickerCalls.push(text);
          api.inject(" world");
          api.done(); // pops picker, leaves injected text in input because clearOnSubmit = false
          onDone();
        },
        clearOnSubmit: false,
      });
      return null;
    };

    const Controller: React.FC = () => {
      const value = useInputValue();
      const setValue = useSetInputValue();
      const submit = useInputSubmit();
      const [showPicker, setShowPicker] = useState(false);
      const [ranSecondSubmit, setRanSecondSubmit] = useState(false);

      useEffect(() => {
        setValue("hello");
        setShowPicker(true);
      }, [setValue]);

      useEffect(() => {
        if (showPicker) {
          // First submit handled by picker
          submit();
        }
      }, [showPicker, submit]);

      useEffect(() => {
        // After picker injects & pops, we should have injected text "hello world".
        if (!showPicker && value === "hello world" && !ranSecondSubmit) {
          setRanSecondSubmit(true);
          submit(); // handled by base, then cleared because base clearOnSubmit=true
        }
      }, [showPicker, value, ranSecondSubmit, submit]);

      return showPicker ? (
        <Picker onDone={() => setShowPicker(false)} />
      ) : (
        <>
          <Base />
        </>
      );
    };

    render(
      <>
        <Base />
        <Controller />
      </>,
    );

    await new Promise((r) => setTimeout(r, 80));

    expect(pickerCalls).toEqual(["hello"]);
    expect(baseCalls).toEqual(["hello world"]);
  });
});
