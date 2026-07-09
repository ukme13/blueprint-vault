'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@blueprint/ui';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, proportional, pixel } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';

/* ────────────────────────────────────────────────────────────────────────
 * Static prop domains — mirrors the CVA config in packages/ui/src/button.tsx
 * ──────────────────────────────────────────────────────────────────────── */

const VARIANTS = ['contained', 'outlined', 'text', 'ghost', 'mixed', 'link'] as const;
const COLORS = [
  'primary',
  'secondary',
  'tertiary',
  'error',
  'warning',
  'info',
  'success',
  'neutral',
] as const;
const SIZES = ['xs', 'small', 'medium', 'large', 'xl', 'icon'] as const;

type ButtonVariant = (typeof VARIANTS)[number];
type ButtonScheme = (typeof COLORS)[number];
type ButtonSize = (typeof SIZES)[number];

/* ────────────────────────────────────────────────────────────────────────
 * Table data — Variant × Color matrix and the Props reference
 * ──────────────────────────────────────────────────────────────────────── */

interface MatrixRow extends Record<string, unknown> {
  variant: ButtonVariant;
}

const matrixData: MatrixRow[] = VARIANTS.map((v) => ({ variant: v }));

const matrixColumns: TableColumn<MatrixRow>[] = [
  {
    key: 'variant',
    header: 'Variant',
    width: pixel(112),
    renderCell: (row) => <span className="text-xs font-bold text-neutral-600">{row.variant}</span>,
  },
  ...COLORS.map(
    (c): TableColumn<MatrixRow> => ({
      key: c,
      header: c,
      width: proportional(1),
      align: 'center',
      renderCell: (row) => (
        <Button scheme={c} variant={row.variant} size="small">
          {c}
        </Button>
      ),
    })
  ),
];

interface PropRow extends Record<string, unknown> {
  prop: string;
  type: string;
  def: string;
  desc: string;
}

const propRows: PropRow[] = [
  {
    prop: 'scheme',
    type: `"primary" | "secondary" | "tertiary" | "error" | "warning" | "info" | "success" | "neutral"`,
    def: '"primary"',
    desc: 'Selects the OKLCH color track. Drives the --btn-main/hover/active/border/soft CSS variables.',
  },
  {
    prop: 'variant',
    type: `"contained" | "outlined" | "text" | "ghost" | "mixed" | "link"`,
    def: '"contained"',
    desc: 'Visual style of the button — how the scheme colors are applied to background, border, and text.',
  },
  {
    prop: 'size',
    type: `"xs" | "small" | "medium" | "large" | "xl" | "icon"`,
    def: '"medium"',
    desc: 'Controls height, padding, radius, and icon scale. "icon" produces a fixed square button.',
  },
  {
    prop: 'children',
    type: 'React.ReactNode',
    def: '—',
    desc: 'Visible button content. Required. If it is a plain string it also becomes the accessible label automatically.',
  },
  {
    prop: 'aria-label',
    type: 'string',
    def: 'undefined',
    desc: 'Accessible name override. Required when children is not a plain string (icons, mixed JSX) — Astryx needs a string label internally.',
  },
  {
    prop: 'loading',
    type: 'boolean',
    def: 'false',
    desc: 'Maps to Astryx isLoading. Shows a spinner and forces isDisabled while true.',
  },
  {
    prop: 'disabled',
    type: 'boolean',
    def: 'false',
    desc: 'Maps to Astryx isDisabled (Astryx has no native disabled prop). Also forced true whenever loading is true.',
  },
  {
    prop: 'leftIcon',
    type: 'React.ReactNode',
    def: 'undefined',
    desc: 'Maps to Astryx icon — rendered before the label. Also used as the glyph when size="icon".',
  },
  {
    prop: 'rightIcon',
    type: 'React.ReactNode',
    def: 'undefined',
    desc: 'Maps to Astryx endContent — rendered after the label. Ignored when size="icon".',
  },
  {
    prop: 'href / as / target / rel',
    type: 'string / React.ElementType / string / string',
    def: 'undefined',
    desc: 'Astryx’s native link polymorphism — passing href renders an <a> (or a custom as component, e.g. Next Link) instead of a <button>. There is no asChild/Slot mechanism.',
  },
  {
    prop: '...props',
    type: 'React.ButtonHTMLAttributes<HTMLButtonElement>',
    def: '—',
    desc: 'Any other native button attribute (onClick, type, name, form, …) is spread onto the element.',
  },
];

const propsColumns: TableColumn<PropRow>[] = [
  {
    key: 'prop',
    header: 'Prop',
    width: proportional(1),
    renderCell: (row) => <span className="font-mono text-[13px] text-primary-600">{row.prop}</span>,
  },
  {
    key: 'type',
    header: 'Type',
    width: proportional(2),
    renderCell: (row) => <span className="font-mono text-[12px] text-neutral-500">{row.type}</span>,
  },
  {
    key: 'def',
    header: 'Default',
    width: proportional(1),
    renderCell: (row) => <span className="font-mono text-[12px] text-neutral-500">{row.def}</span>,
  },
  {
    key: 'desc',
    header: 'Description',
    width: proportional(3),
    renderCell: (row) => <span className="text-[13px] leading-relaxed text-neutral-700">{row.desc}</span>,
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * Sample icons for the leftIcon/rightIcon preview
 * ──────────────────────────────────────────────────────────────────────── */

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Small chrome helpers
 * ──────────────────────────────────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-primary-600">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-black tracking-tight text-neutral-900">{title}</h2>
      {description && <p className="max-w-2xl text-sm text-neutral-600">{description}</p>}
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-xl shadow-neutral-200/50 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────── */

export default function ButtonDocsPage() {
  const [scheme, setScheme] = useState<ButtonScheme>('primary');
  const [variant, setVariant] = useState<ButtonVariant>('contained');
  const [size, setSize] = useState<ButtonSize>('medium');
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLeftIcon, setShowLeftIcon] = useState(false);
  const [showRightIcon, setShowRightIcon] = useState(false);

  const isIconOnly = size === 'icon';
  const leftIcon = !isIconOnly && showLeftIcon ? <PlusIcon /> : undefined;
  const rightIcon = !isIconOnly && showRightIcon ? <ArrowRightIcon /> : undefined;

  const importSnippet = `import { Button } from "@blueprint/ui";`;

  const playgroundSnippet = useMemo(() => {
    const props: string[] = [];
    if (scheme !== 'primary') props.push(`scheme="${scheme}"`);
    if (variant !== 'contained') props.push(`variant="${variant}"`);
    if (size !== 'medium') props.push(`size="${size}"`);
    if (disabled) props.push('disabled');
    if (loading) props.push('loading');
    if (!isIconOnly && showLeftIcon) props.push('leftIcon={<PlusIcon />}');
    if (!isIconOnly && showRightIcon) props.push('rightIcon={<ArrowRightIcon />}');
    const propString = props.length ? ' ' + props.join(' ') : '';
    return `<Button${propString}>\n  Continue\n</Button>`;
  }, [scheme, variant, size, disabled, loading, isIconOnly, showLeftIcon, showRightIcon]);

  return (
    <main className="min-h-screen bg-linear-to-br from-neutral-50 via-white to-neutral-100 p-4 font-sans antialiased md:p-10">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* ── 1. Hero Header & Import Guide ───────────────────────────── */}
        <header className="space-y-8 border-b border-neutral-200 pb-10">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              @blueprint/ui · Component
            </span>
            <h1 className="text-4xl font-black tracking-tight text-neutral-900 md:text-5xl">Button</h1>
            <p className="max-w-2xl text-base leading-relaxed text-neutral-600">
              A polymorphic, CVA-driven button built on the Atmos 25-interval OKLCH color
              grid. Supports 8 color schemes across 6 visual variants and 6 sizes, with
              built-in loading and icon slots.
            </p>
          </div>
          <CodeBlock title="Import" language="tsx" code={importSnippet} />
        </header>

        {/* ── 2. Interactive Component Playground ─────────────────────── */}
        <section className="space-y-6">
          <SectionHeading
            eyebrow="Playground"
            title="Interactive Preview"
            description="Tweak props on the right and watch the live button update on the left."
          />
          <Card>
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Live preview */}
              <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10">
                <Button
                  scheme={scheme}
                  variant={variant}
                  size={size}
                  disabled={disabled}
                  loading={loading}
                  leftIcon={leftIcon}
                  rightIcon={rightIcon}
                >
                  {isIconOnly ? <ArrowRightIcon /> : 'Continue'}
                </Button>
              </div>

              {/* Controls */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Selector
                    label="Scheme"
                    size="md"
                    options={COLORS.map((c) => ({ value: c, label: c }))}
                    value={scheme}
                    onChange={(v) => setScheme(v as ButtonScheme)}
                  />

                  <Selector
                    label="Variant"
                    size="md"
                    options={VARIANTS.map((v) => ({ value: v, label: v }))}
                    value={variant}
                    onChange={(v) => setVariant(v as ButtonVariant)}
                  />

                  <Selector
                    label="Size"
                    size="md"
                    options={SIZES.map((s) => ({ value: s, label: s }))}
                    value={size}
                    onChange={(v) => setSize(v as ButtonSize)}
                  />

                  <div className="flex flex-col justify-end gap-2.5 pb-1">
                    <CheckboxInput label="Disabled" size="sm" value={disabled} onChange={setDisabled} />
                    <CheckboxInput label="Loading" size="sm" value={loading} onChange={setLoading} />
                    <CheckboxInput
                      label="Left icon"
                      size="sm"
                      value={showLeftIcon}
                      isDisabled={isIconOnly}
                      onChange={setShowLeftIcon}
                    />
                    <CheckboxInput
                      label="Right icon"
                      size="sm"
                      value={showRightIcon}
                      isDisabled={isIconOnly}
                      onChange={setShowRightIcon}
                    />
                  </div>
                </div>

                <CodeBlock title="Generated JSX" language="tsx" code={playgroundSnippet} />
              </div>
            </div>
          </Card>
        </section>

        {/* ── 3. Variant & Color Grid Matrix ───────────────────────────── */}
        <section className="space-y-6">
          <SectionHeading
            eyebrow="Matrix"
            title="Variant × Color Grid"
            description="Every one of the 6 variants rendered against all 8 core color tracks — use this to eyeball contrast across the 25-interval grid."
          />
          <Card>
            <Table data={matrixData} columns={matrixColumns} idKey="variant" hasHover />
          </Card>
        </section>

        {/* ── 4. Size Spectrum ─────────────────────────────────────────── */}
        <section className="space-y-6">
          <SectionHeading
            eyebrow="Scale"
            title="Size Spectrum"
            description="xs, small, medium, large, xl, and icon sizes side by side to verify height and alignment consistency."
          />
          <Card>
            <div className="flex flex-wrap items-end gap-6">
              {SIZES.map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Button scheme="primary" variant="contained" size={s}>
                    {s === 'icon' ? <PlusIcon /> : 'Button'}
                  </Button>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── 5. API Props Reference ───────────────────────────────────── */}
        <section className="space-y-6 pb-16">
          <SectionHeading
            eyebrow="Reference"
            title="Props"
            description="Full API surface. Any remaining native <button> attributes (onClick, type, aria-*, …) are forwarded as-is."
          />
          <Card>
            <Table data={propRows} columns={propsColumns} idKey="prop" hasHover />
          </Card>
        </section>
      </div>
    </main>
  );
}
