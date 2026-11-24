import type * as React from "react";

type ButtonProps = React.ComponentProps<"button"> & { variant?: string; size?: string };
export function buttonVariants(_options?: { variant?: string }): string {
  return "btn";
}
export function Button({ variant: _variant, size: _size, ...props }: ButtonProps) {
  return <button type="button" {...props} />;
}
