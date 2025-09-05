import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import React, { useEffect, useState } from "react";
import { useSetInputValue, useStackedRouteInput } from "./index";

// Ensures route input registration (handler stack push) does not cause re-renders
// when only the input value changes rapidly.

const RouteRegistration: React.FC<{ onRender: (n: number) => void }> = ({ onRender }) => {
  const [renders, setRenders] = useState(0);
  useStackedRouteInput({ onSubmit: () => {}, placeholder: "placeholder" });
  useEffect(() => {
    setRenders((r) => r + 1);
  }, []);
  useEffect(() => {
    onRender(renders);
  }, [renders, onRender]);
  return null;
};

const InputChanger: React.FC<{ values: string[] }> = ({ values }) => {
  const setValue = useSetInputValue();
  useEffect(() => {
    values.forEach((v, i) => {
      setTimeout(() => setValue(v), 5 + i * 5);
    });
  }, [values, setValue]);
  return null;
};

describe("inputStore rerender isolation", () => {
  it("registration component does not re-render on value changes (only initial + placeholder)", async () => {
    const seen: number[] = [];
    render(
      <>
        <RouteRegistration onRender={(n) => seen.push(n)} />
        <InputChanger values={["a", "b", "c", "d"]} />
      </>,
    );
    await new Promise((r) => setTimeout(r, 80));
    expect(seen.length).toBeLessThanOrEqual(2);
    expect(seen[seen.length - 1]).toBe(1);
  });
});
