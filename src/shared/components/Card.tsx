import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  elevated?: boolean;
}

export default function Card({ children, className = "", elevated = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[28px] border ${
        elevated
          ? "border-border/8 bg-surface-elevated/84 backdrop-blur-[28px] shadow-[0_22px_54px_-40px_rgba(2,6,23,0.52)]"
          : "border-border/6 bg-surface/80 backdrop-blur-[28px] shadow-[0_18px_42px_-34px_rgba(2,6,23,0.34)]"
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
