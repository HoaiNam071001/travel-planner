import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  elevated?: boolean;
}

export default function Card({ children, className = "", elevated = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-3xl border ${
        elevated
          ? "border-border/12 bg-surface-elevated/95 shadow-card-hover"
          : "border-border/10 bg-surface/92 shadow-card"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
