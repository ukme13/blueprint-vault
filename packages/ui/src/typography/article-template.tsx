import { ARTICLE_COPY } from "./article-copy";
import { localizeCopy } from "./preview-template-text";
import {
  headingTags,
  withSpecimenText,
  type TemplateProps,
} from "./preview-template-shared";

export function ArticleTemplate({
  styleFor,
  lang = "en",
  text,
  classNames,
  headingLevel = 1,
}: TemplateProps) {
  const { Title, Section } = headingTags(headingLevel);
  const copy = withSpecimenText(ARTICLE_COPY[lang], text);
  const wrap = (value: string) => localizeCopy(lang, text, value);

  return (
    <article className={classNames?.article}>
      <p style={styleFor("label")}>{wrap(copy.kicker)}</p>
      <Title style={styleFor("display")}>{wrap(copy.title)}</Title>
      <p style={styleFor("title")}>{wrap(copy.standfirst)}</p>
      <p style={styleFor("caption")}>{wrap(copy.byline)}</p>

      <Section style={styleFor("heading")}>{wrap(copy.headingOne)}</Section>
      <p style={styleFor("body")}>{wrap(copy.bodyOne)}</p>

      <blockquote style={styleFor("title")}>{wrap(copy.quote)}</blockquote>

      <Section style={styleFor("heading")}>{wrap(copy.headingTwo)}</Section>
      <p style={styleFor("body")}>{wrap(copy.bodyTwo)}</p>

      <figure>
        <figcaption style={styleFor("caption")}>
          {wrap(copy.caption)}
        </figcaption>
      </figure>
    </article>
  );
}
