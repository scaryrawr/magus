import { SubprocessOutput } from "./SubprocessOutput";

type GlowProps = {
  children: string;
};

export const Glow: React.FC<GlowProps> = ({ children }) => {
  return <SubprocessOutput command="glow">{children}</SubprocessOutput>;
};
