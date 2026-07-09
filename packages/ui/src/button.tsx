'use client';

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button as AstryxButton } from "./astryx/Button";

/**
 * Utility to combine classNames safely
 */
const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(" ");

/**
 * CVA Button Variants
 * Maps design tokens using local CSS variables across the 25-interval OKLCH grid
 * Color system: primary, secondary, tertiary, error, warning, info, success, neutral
 * Display variants: contained, outlined, text, ghost, mixed, link
 * Sizes: xs, small, medium, large, xl, icon
 *
 * The underlying Button (packages/ui/src/astryx/Button) is a swizzled,
 * de-StyleX'd copy of @astryxdesign/core/Button — it owns zero cosmetics,
 * so these classes are the only thing that ever draws pixels. No `!important`
 * needed; there's no competing stylesheet to out-specificity anymore.
 */
const buttonVariants = cva(
  // Base styles applied to all button states
  "inline-flex items-center justify-center font-semibold transition duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none",
  {
    variants: {
      /**
       * Scheme: Maps to CSS variables for flexible theming across 25-interval grid
       * Each color preset defines: main, contrast, hover, active, border, soft, soft-hover
       */
      scheme: {
        primary:
          "[--btn-main:var(--color-primary-400)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-primary-350)] [--btn-active:var(--color-primary-500)] [--btn-border:var(--color-primary-400)] [--btn-soft:var(--color-primary-50)] [--btn-soft-hover:var(--color-primary-100)]",
        secondary:
          "[--btn-main:var(--color-secondary-500)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-secondary-450)] [--btn-active:var(--color-secondary-600)] [--btn-border:var(--color-secondary-400)] [--btn-soft:var(--color-secondary-50)] [--btn-soft-hover:var(--color-secondary-100)]",
        tertiary:
          "[--btn-main:var(--color-tertiary-600)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-tertiary-550)] [--btn-active:var(--color-tertiary-700)] [--btn-border:var(--color-tertiary-400)] [--btn-soft:var(--color-tertiary-50)] [--btn-soft-hover:var(--color-tertiary-100)]",
        error:
          "[--btn-main:var(--color-error-600)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-error-550)] [--btn-active:var(--color-error-700)] [--btn-border:var(--color-error-400)] [--btn-soft:var(--color-error-50)] [--btn-soft-hover:var(--color-error-100)]",
        warning:
          "[--btn-main:var(--color-warning-300)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-warning-250)] [--btn-active:var(--color-warning-400)] [--btn-border:var(--color-warning-400)] [--btn-soft:var(--color-warning-50)] [--btn-soft-hover:var(--color-warning-100)]",
        info:
          "[--btn-main:var(--color-info-500)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-info-450)] [--btn-active:var(--color-info-600)] [--btn-border:var(--color-info-400)] [--btn-soft:var(--color-info-50)] [--btn-soft-hover:var(--color-info-100)]",
        success:
          "[--btn-main:var(--color-success-500)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-success-450)] [--btn-active:var(--color-success-600)] [--btn-border:var(--color-success-400)] [--btn-soft:var(--color-success-50)] [--btn-soft-hover:var(--color-success-100)]",
        neutral:
          "[--btn-main:var(--color-neutral-500)] [--btn-contrast:var(--color-neutral-50)] [--btn-hover:var(--color-neutral-450)] [--btn-active:var(--color-neutral-600)] [--btn-border:var(--color-neutral-400)] [--btn-soft:var(--color-neutral-50)] [--btn-soft-hover:var(--color-neutral-100)]",
      },

      /**
       * Variant: Button display style
       * Uses local CSS variables to avoid compoundVariants bloat
       */
      variant: {
        contained:
          "border border-transparent bg-[var(--btn-main)] text-[var(--btn-contrast)] hover:bg-[var(--btn-hover)] active:bg-[var(--btn-active)] shadow-sm hover:shadow-md",
        outlined:
          "border border-[var(--btn-border)] bg-transparent text-[var(--btn-main)] hover:bg-[var(--btn-soft)] active:bg-[var(--btn-soft-hover)]",
        text: "border border-transparent bg-transparent text-[var(--btn-main)] hover:bg-[var(--btn-soft)] active:bg-[var(--btn-soft-hover)]",
        ghost:
          "border border-transparent bg-[var(--btn-soft)]/50 text-[var(--btn-main)] hover:bg-[var(--btn-soft)]",
        mixed:
          "border border-[var(--btn-border)] bg-[var(--btn-soft)] text-[var(--btn-main)] hover:bg-[var(--btn-soft-hover)] active:bg-[var(--btn-border)] active:text-[var(--btn-contrast)]",
        link: "border border-transparent bg-transparent text-[var(--btn-main)] underline-offset-4 hover:underline",
      },

      /**
       * Size: Button dimensions and spacing
       * Includes responsive text and icon sizing
       */
      size: {
        xs: "h-6 px-2.5 py-0 text-[10px] rounded-lg gap-1 [&_svg]:size-3",
        small: "h-7 px-3 py-0 text-xs rounded-lg gap-1.5 [&_svg]:size-3.5",
        medium: "h-9 px-4 py-0 text-sm rounded-lg gap-2 [&_svg]:size-4",
        large: "h-11 px-6 py-0 text-base rounded-lg gap-2.5 [&_svg]:size-4.5",
        xl: "h-14 px-8 py-0 text-lg rounded-lg gap-3 [&_svg]:size-5.5 font-bold",
        icon: "h-9 w-9 p-0 rounded-lg [&_svg]:size-5",
      },
    },

    defaultVariants: {
      scheme: "primary",
      variant: "contained",
      size: "medium",
    },
  }
);

/**
 * Button Component Props
 * Extends HTML button attributes and CVA variant props
 */
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /**
   * Renders the button as a link (`<a>` or a custom component, e.g. Next's
   * `Link`) instead of a native `<button>`. Mirrors Astryx's own href/as
   * polymorphism — there is no Radix Slot/asChild mechanism under the hood.
   */
  href?: string;
  as?: React.ElementType;
  target?: string;
  rel?: string;
}

/**
 * Button Component
 * Production-ready wrapper around our swizzled Astryx Button with CVA variant management
 * Uses local CSS variables to map the 25-interval OKLCH color grid
 * Supports 8 color presets × 6 display variants × 6 sizes
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      scheme,
      variant,
      size,
      className,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      href,
      as,
      target,
      rel,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size === "icon";
    const iconContent = leftIcon ?? (isIconOnly ? children : undefined);

    // Astryx requires a string `label` for the accessible name. When children
    // is plain text we can derive it automatically; otherwise (icons, mixed
    // JSX) the caller must supply aria-label.
    const label =
      typeof children === "string"
        ? children
        : ariaLabel ?? "";

    return (
      <AstryxButton
        ref={ref}
        label={label}
        aria-label={ariaLabel}
        className={cn(buttonVariants({ scheme, variant, size }), className)}
        isDisabled={disabled || loading}
        isLoading={loading}
        isIconOnly={isIconOnly}
        icon={iconContent}
        endContent={isIconOnly ? undefined : rightIcon}
        href={href}
        as={as}
        target={target}
        rel={rel}
        {...props}
      >
        {isIconOnly ? undefined : children}
      </AstryxButton>
    );
  }
);

Button.displayName = "Button";
