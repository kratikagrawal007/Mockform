import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  children: ReactNode;
}

export function IconButton({
  label,
  shortcut,
  children,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`grid size-8 place-items-center rounded-[var(--radius-control)] text-muted transition-colors duration-150 hover:bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-35 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
