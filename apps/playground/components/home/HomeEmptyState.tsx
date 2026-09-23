import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@blueprint/ui";
import { docsLink } from "../../lib/docs-url";
import { StudioGuideIcon } from "../shell/shell-marks";

/**
 * What Home shows with no projects: two ways forward, centred in the space the
 * grid would fill.
 *
 * The header above stays — the "Projects" heading, the count, Import and New
 * project — so this only replaces the empty grid, and a new person can still
 * restore a file from the header rather than being handed a page with no way
 * to import.
 *
 * Button labels avoid "New project" and "Import project" on purpose. Most
 * end-to-end specs reach a studio through `getByRole("button", { name: "New
 * project" })`, which matches by substring, so a second button whose name
 * contained those words would make the header's button ambiguous.
 */
export function HomeEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section
      aria-label="Get started"
      className="flex flex-1 items-center justify-center py-12"
    >
      <ul className="grid w-full max-w-xl list-none gap-4 p-0 sm:grid-cols-2">
        <EmptyStateCard
          action={
            <Button className="w-full" scheme="primary" onClick={onCreate}>
              Create a project
            </Button>
          }
          art={
            <span className="grid size-12 place-items-center rounded-element bg-action-primary text-fg-on-action">
              <Plus aria-hidden className="size-6" />
            </span>
          }
          body="Start from the Blueprint seed or a preset, then shape colour, type and scale."
          title="Create your first project"
        />
        <EmptyStateCard
          action={
            <Button
              className="w-full"
              href={docsLink("studio")}
              rel="noreferrer"
              scheme="neutral"
              target="_blank"
            >
              View guides
            </Button>
          }
          art={<StudioGuideIcon className="size-10 text-fg-muted" />}
          body="Step-by-step guides for each studio, on the docs site."
          title="Need help?"
        />
      </ul>
    </section>
  );
}

/**
 * One card: an illustration tile, a title and a line, and an action pinned to
 * the bottom so both cards' buttons line up however long either line runs.
 */
function EmptyStateCard({
  action,
  art,
  body,
  title,
}: {
  action: ReactNode;
  art: ReactNode;
  body: string;
  title: string;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-container border border-border-subtle bg-surface-raised p-6">
      <div className="grid h-24 place-items-center rounded-element border border-border-subtle bg-surface-base">
        {art}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-base font-bold text-fg-primary">{title}</h2>
        <p className="m-0 text-sm text-fg-muted">{body}</p>
      </div>
      <div className="mt-auto">{action}</div>
    </li>
  );
}
