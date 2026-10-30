import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "soft";

const variantClass: Record<ButtonVariant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  outline: "small-action",
  soft: "simulation-button",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

/** Shared button primitive with X_Farm's design-system variants. */
export function Button({ className, type = "button", variant = "primary", ...props }: ButtonProps) {
  return <button type={type} className={cn(variantClass[variant], className)} {...props} />;
}
