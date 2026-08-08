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
          ? "border-border/50 bg-surface-elevated shadow-card-hover"
          : "border-border/40 bg-surface/97 shadow-card"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
