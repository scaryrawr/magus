import { useLocation, type Location } from "react-router";

export const useSafeLocation = <T>() => {
  const location = useLocation();
  return location as Location<T | undefined>;
};
