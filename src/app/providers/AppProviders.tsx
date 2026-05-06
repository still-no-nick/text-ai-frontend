import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export const AppProviders = (props: Props) => {
  return <>{props.children}</>;
};
