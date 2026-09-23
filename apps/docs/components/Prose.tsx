import { Fragment } from "react";
import { Text } from "@astryxdesign/core/Text";

/**
 * A guidance paragraph, with role names set as code.
 *
 * The content module writes role names in backticks, which is how the test
 * that checks them finds them and how the roadmap documents read. Rendering
 * the string raw put the backticks on the page; stripping them in the content
 * module would leave the test looking for names with nothing to distinguish
 * them from ordinary words.
 *
 * So the marker stays in the source and is read here. Odd segments of a split
 * on the backtick are the code spans, which is the whole of the syntax this
 * needs to know — a paragraph wanting more than that is a paragraph that
 * wants MDX, and the plan says not yet.
 *
 * The measure is capped here rather than by the frame. The frame used to cap
 * its whole column at 960 to keep a line readable, which also held every
 * table to 960 — and a token table with both modes across it wants the room.
 * Capping the paragraph instead lets the two want different things. In `ch`,
 * because a measure is a count of characters and follows the face and size
 * the reader actually has.
 */
export function Prose({ children }: { children: string }) {
  return (
    <Text as="p" className="prose-measure" color="secondary" display="block">
      {children.split("`").map((part, at) =>
        at % 2 === 1 ? (
          <Text key={`${part}-${at}`} type="code">
            {part}
          </Text>
        ) : (
          <Fragment key={`${part}-${at}`}>{part}</Fragment>
        ),
      )}
    </Text>
  );
}
