/**
 * The foot of every page.
 *
 * What it says is deliberately short. The reference carries three rows of
 * product links, a social bar and a legal line; this system has a
 * documentation site and an archive, and inventing the rest would be
 * decorating rather than documenting.
 *
 * The line about the archive is the one thing worth repeating at the bottom of
 * every page: a reader who got here from a folder rather than a URL is reading
 * a snapshot of one workspace, and should know it.
 */
export function SiteFooter() {
  return (
    <div className="site-footer">
      <span className="site-footer-name">Blueprint</span>
      <p className="site-footer-note">
        Generated from a workspace. Every value on these pages comes from the
        system they document.
      </p>
    </div>
  );
}
