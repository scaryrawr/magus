import { Text } from "ink";

type DiffViewerProps = {
  children: string;
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ children }) => {
  return children.split("\n").map((line, i) => {
    switch (line[0]) {
      case "@":
        return (
          <Text color="blue" key={i}>
            {line}
          </Text>
        );
      case "+":
        return (
          <Text color="green" key={i}>
            {line}
          </Text>
        );
      case "-":
        return (
          <Text color="red" key={i}>
            {line}
          </Text>
        );
      default:
        return <Text key={i}>{line}</Text>;
    }
  });
};
