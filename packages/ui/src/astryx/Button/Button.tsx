'use client';

/**
 * Swizzled from @astryxdesign/core/Button.
 *
 * The upstream component styles itself unconditionally via StyleX
 * (color, size, border, radius, font — see the original source via
 * `pnpm xds component Button`). That fights our CVA + Tailwind Atmos
 * grid for the same CSS properties with no reliable winner, since two
 * different atomic-CSS systems don't share a cascade-order contract.
 *
 * This copy keeps 100% of the original *behavior* (loading/spinner
 * timing, tooltip wiring, icon-only a11y, link polymorphism, clickAction
 * dedupe, button-group disabled awareness) and removes 100% of the
 * upstream *cosmetic* StyleX so the caller's className is the only
 * thing that ever draws pixels — no specificity fights, no `!important`.
 */

import { useRef, useTransition, type ReactNode } from 'react';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Spinner } from '@astryxdesign/core/Spinner';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { useButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { useLinkComponent } from '@astryxdesign/core/Link';
import type { LinkComponentType } from '@astryxdesign/core/Link';

const cn = (...classes: (string | undefined | false | null)[]): string =>
  classes.filter(Boolean).join(' ');

/**
 * Astryx's internal `BaseProps` type isn't exported as a public subpath
 * (only whole components are), so this swizzled copy extends the plain
 * native button attributes instead — we own this file now anyway.
 */
export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'color' | 'type' | 'name' | 'value' | 'form' | 'children' | 'onClick'
  > {
  /** Ref forwarded to the root element */
  ref?: React.Ref<HTMLButtonElement>;
  /** HTML button type attribute. @default 'button' */
  type?: 'button' | 'submit' | 'reset';
  /** HTML name attribute for form submission. */
  name?: string;
  /** HTML value attribute for form submission. */
  value?: string | number | ReadonlyArray<string>;
  /** Associates the button with a form element by ID. */
  form?: string;
  /**
   * Accessible label for the button (required for accessibility).
   * Rendered as visible text by default. When `isIconOnly` is true,
   * used as aria-label instead.
   */
  label: string;
  /**
   * Whether the button is disabled.
   * @default false
   */
  isDisabled?: boolean;
  /**
   * Whether the button is in a loading state.
   * @default false
   */
  isLoading?: boolean;
  /**
   * Keep the button interactive while a `clickAction` is pending. See
   * upstream docs (`pnpm xds component Button`) for full semantics.
   * @default false
   */
  isInterruptible?: boolean;
  /**
   * Click handler. For async actions that should show a loading state,
   * use `clickAction` instead.
   */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /**
   * Async click action. Shows loading state while pending.
   */
  clickAction?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /**
   * Icon element rendered before the label text.
   */
  icon?: ReactNode;
  /**
   * When true, renders as a square icon-only button with `label` as aria-label.
   * Requires `icon` to be provided.
   * @default false
   */
  isIconOnly?: boolean;
  /**
   * Optional visible content. When provided, rendered instead of `label` as the
   * visible text (label still serves as the accessible name via aria-label).
   */
  children?: ReactNode;
  /**
   * Content rendered after the label text (badge, icon, chevron, etc.).
   * Ignored when `isIconOnly` is true to preserve square aspect ratio.
   */
  endContent?: ReactNode;
  /**
   * Tooltip text shown on hover.
   */
  tooltip?: string;
  /**
   * When provided, renders the button as a link (`<a>` or custom component).
   * When the button is disabled, still renders as `<button>` regardless of href
   * (disabled links are an accessibility anti-pattern).
   */
  href?: string;
  /**
   * Custom link component to use when `href` is provided.
   * Useful for Next.js `<Link>` or other router-aware components.
   */
  as?: LinkComponentType;
  /**
   * HTML target attribute for the link. Only applies when `href` is provided.
   */
  target?: string;
  /**
   * HTML rel attribute for the link. Only applies when `href` is provided.
   */
  rel?: string;
}

export function Button({
  label,
  type = 'button',
  isDisabled = false,
  isLoading = false,
  isInterruptible = false,
  clickAction,
  icon,
  isIconOnly = false,
  children,
  endContent,
  tooltip,
  href,
  as,
  target,
  rel,
  className,
  style,
  ref,
  ...props
}: ButtonProps): ReactNode {
  const buttonGroup = useButtonGroup();

  const [isPending, startTransition] = useTransition();
  // clickAction is normally fire-once (submit/save/pay), so a same-tick
  // double-click must dedupe. Interruptible callers (e.g. ToggleButton) opt
  // out so a re-click can land and interrupt the in-flight action.
  const actionInFlightRef = useRef(false);
  const isLoadingState = isLoading || isPending;
  const delaySpinner = isPending || isInterruptible;
  const groupDisabled = buttonGroup?.isDisabled ?? false;
  const buttonDisabled =
    isDisabled || groupDisabled || (isLoadingState && !isInterruptible);

  const LinkComponent = useLinkComponent(as);

  // Render as link when href is provided and button is not disabled.
  // Disabled links are an accessibility anti-pattern — fall back to <button>.
  const renderAsLink = href != null && !buttonDisabled;

  // Use aria-disabled when tooltip is present so the button remains focusable
  // for keyboard users to reach the tooltip. Otherwise use native disabled.
  const useAriaDisabled = tooltip != null && buttonDisabled;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonDisabled || (actionInFlightRef.current && !isInterruptible)) {
      e.preventDefault();
      return;
    }
    props.onClick?.(e);
    if (clickAction && !e.defaultPrevented) {
      actionInFlightRef.current = true;
      startTransition(async () => {
        try {
          await clickAction(e);
        } finally {
          actionInFlightRef.current = false;
        }
      });
    }
  };

  // When aria-disabled, suppress activation keys (Enter/Space) but allow
  // other keys (Escape, arrows) to reach consumer handlers.
  const handleKeyDown = useAriaDisabled
    ? (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        } else {
          props.onKeyDown?.(e);
        }
      }
    : undefined;

  // No cosmetic defaults here on purpose — the caller's className (our CVA
  // output) owns color, size, border, radius, font, and press affordance
  // (active:scale) entirely. Only structural/behavioral classes live here,
  // so there's never two conflicting rules fighting over the same property.
  const rootClassName = cn(
    'relative inline-flex items-center justify-center whitespace-nowrap',
    buttonDisabled && 'cursor-not-allowed active:scale-100',
    isIconOnly && 'aspect-square',
    className
  );

  const buttonContent = (
    <>
      {isLoadingState && (
        <span
          className={cn(
            'absolute inset-0 grid place-items-center',
            delaySpinner && 'motion-safe:animate-[fade-in_150ms_ease-out_120ms_backwards]'
          )}
          aria-hidden="true"
        >
          <Spinner size="sm" shade="inherit" />
        </span>
      )}
      <span
        className={cn('contents', isLoadingState && 'text-transparent')}
        aria-hidden={isLoadingState || undefined}
      >
        {icon && (
          <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
        )}
        {isIconOnly ? null : (
          <span className="min-w-0">{children ?? label}</span>
        )}
        {!isIconOnly && endContent && (
          <span className="inline-flex items-center text-inherit">{endContent}</span>
        )}
      </span>
      {/* Live region for loading state announcements */}
      <VisuallyHidden role="status" aria-live="polite">
        {isLoadingState ? 'Loading' : ''}
      </VisuallyHidden>
    </>
  );

  // aria-label is set when:
  // 1. Icon-only mode (label is the only accessible name)
  // 2. Loading state on non-icon-only (announce the button's purpose)
  // 3. Children differ from label (children are visible, label is accessible name)
  const needsAriaLabel =
    (isIconOnly && label !== '') ||
    (isLoadingState && !isIconOnly) ||
    (children != null && children !== label);
  const ariaLabelProp = needsAriaLabel ? { 'aria-label': label } : null;

  let element: ReactNode;

  if (renderAsLink) {
    element = (
      <LinkComponent
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel}
        className={rootClassName}
        style={style}
        {...props}
        {...ariaLabelProp}
        onClick={handleClick}
      >
        {buttonContent}
      </LinkComponent>
    );
  } else {
    element = (
      <button
        ref={ref}
        type={type}
        disabled={useAriaDisabled ? undefined : buttonDisabled}
        className={rootClassName}
        style={style}
        {...props}
        {...ariaLabelProp}
        aria-busy={isLoadingState || undefined}
        aria-disabled={useAriaDisabled || undefined}
        onClick={handleClick}
        {...(handleKeyDown ? { onKeyDown: handleKeyDown } : null)}
      >
        {buttonContent}
      </button>
    );
  }

  if (tooltip) {
    return (
      <Tooltip content={tooltip} placement="above">
        {element}
      </Tooltip>
    );
  }

  return element;
}

Button.displayName = 'Button';
