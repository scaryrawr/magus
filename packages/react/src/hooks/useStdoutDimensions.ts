import { useStdout } from "ink";
import { useEffect, useState } from "react";

export type Dimensions = {
  columns: number;
  rows: number;
};

export const useStdoutDimensions = () => {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState<Dimensions>({
    columns: stdout.columns,
    rows: stdout.rows,
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        columns: stdout.columns,
        rows: stdout.rows,
      });
    };

    stdout.on("resize", updateDimensions);
    return () => {
      stdout.off("resize", updateDimensions);
    };
  }, [stdout]);

  return dimensions;
};
