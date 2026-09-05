"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button as AstryxButton } from "./astryx/Button";
import { buttonToneStyle, type ButtonScheme } from "./button-tones";

/**
 * Utility to combine classNames safely
 */
const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(" ");

/**
 * The Button's classes: a tone crossed with a way of applying it.
 *
 * Every colour comes from the semantic layer. It used to come from the
 * primitive grid — `--color-primary-400`, `--color-neutral-50` — which meant
 * the button had one appearance in both modes and the studio's own Semantics
 * tab could not change it. Now a scheme is seven roles and every one of them
 * carries a light value and a dark one.
 *
 * Six schemes, six variants, six sizes. `secondary` and `tertiary` are gone:
 * they drew from tracks no workspace has ever contained.
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
      variant: {
        contained:
          "border border-transparent bg-[var(--btn-main)] text-[var(--btn-contrast)] hover:bg-[var(--btn-hover)] active:bg-[var(--btn-active)] shadow-sm hover:shadow-md",
        outlined:
          "border border-[var(--btn-border)] bg-transparent text-[var(--btn-fg)] hover:bg-[var(--btn-soft)] active:bg-[var(--btn-soft-hover)]",
        text: "border border-transparent bg-transparent text-[var(--btn-fg)] hover:bg-[var(--btn-soft)] active:bg-[var(--btn-soft-hover)]",
        ghost:
          "border border-transparent bg-[var(--btn-soft)] text-[var(--btn-fg)] hover:bg-[var(--btn-soft-hover)]",
        mixed:
          "border border-[var(--btn-border)] bg-[var(--btn-soft)] text-[var(--btn-fg)] hover:bg-[var(--btn-soft-hover)] active:bg-[var(--btn-main)] active:text-[var(--btn-contrast)]",
        link: "border border-transparent bg-transparent text-[var(--btn-fg)] underline-offset-4 hover:underline",
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
      variant: "contained",
      size: "medium",
    },
  },
);

/**
 * Button Component Props
 * Extends HTML button attributes and CVA variant props
 */
export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  /**
   * Which tone to draw in.
   *
   * Its own prop rather than a cva variant, because it is applied as custom
   * properties on the element instead of as classes. See `buttonToneStyle`.
   */
  scheme?: ButtonScheme;
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
      style,
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
    ref,
  ) => {
    const isIconOnly = size === "icon";
    const iconContent = leftIcon ?? (isIconOnly ? children : undefined);

    // Astryx requires a string `label` for the accessible name. When children
    // is plain text we can derive it automatically; otherwise (icons, mixed
    // JSX) the caller must supply aria-label.
    const label = typeof children === "string" ? children : (ariaLabel ?? "");

    return (
      <AstryxButton
        ref={ref}
        label={label}
        aria-label={ariaLabel}
        className={cn(buttonVariants({ variant, size }), className)}
        style={{ ...buttonToneStyle(scheme ?? "primary"), ...style }}
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
  },
);

Button.displayName = "Button";
