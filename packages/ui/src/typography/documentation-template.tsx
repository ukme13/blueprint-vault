import { localizeCopy } from "./preview-template-text";
import {
  headingTags,
  withSpecimenText,
  type TemplateProps,
} from "./preview-template-shared";

const DOCUMENTATION = {
  en: {
    navLabel: "On this page",
    navKicker: "Foundations",
    navColour: "Colour",
    navType: "Typography",
    navSpace: "Spacing",
    kicker: "Typography",
    title: "Roles, not a ramp of sizes",
    standfirst:
      "A scale is useful when every step has a job. Documentation is where that claim is easiest to break: a heading ladder that looks even in a specimen will crowd a sidebar and a code caption.",
    heading: "Write the page, then pick the sizes",
    body: "Start from the paragraph. The sidebar, the page title and the caption under a snippet should all sit on the same screen without two of them colliding. If they cannot, the scale is too tight, not the layout.",
    subheading: "What a caption is for",
    bodyTwo:
      "Captions, timestamps and code labels are the same quiet job. They share a size so a docs page does not grow a third small step for each.",
    snippet: "font-size: var(--font-body-size);",
    caption: "The body role, as the export names it",
  },
  th: {
    navLabel: "ในหน้านี้",
    navKicker: "รากฐาน",
    navColour: "สี",
    navType: "ตัวอักษร",
    navSpace: "ระยะห่าง",
    kicker: "ตัวอักษร",
    title: "บทบาท ไม่ใช่ลำดับขนาด",
    standfirst:
      "สเกลมีประโยชน์เมื่อทุกขั้นมีหน้าที่ หน้าคู่มือคือที่ที่ข้ออ้างนั้นพังง่ายที่สุด: บันไดหัวข้อที่ดูสม่ำเสมอในหน้าตัวอย่างจะเบียดแถบข้างและแคปชันของโค้ด",
    heading: "เขียนหน้าก่อน แล้วค่อยเลือกขนาด",
    body: "เริ่มจากย่อหน้า แถบข้าง ชื่อหน้า และแคปชันใต้ตัวอย่างต้องอยู่ร่วมจอได้โดยไม่ชนกัน ถ้าอยู่ร่วมไม่ได้ สเกลแน่นเกินไป ไม่ใช่เลย์เอาต์",
    subheading: "แคปชันมีไว้ทำอะไร",
    bodyTwo:
      "แคปชัน เวลา และป้ายโค้ดเป็นงานเงียบงานเดียวกัน ใช้ขนาดร่วมกันเพื่อไม่ให้หน้าคู่มือโตเป็นขั้นเล็กที่สามทุกครั้ง",
    snippet: "font-size: var(--font-body-size);",
    caption: "บทบาทเนื้อหา ตามชื่อที่ไฟล์ส่งออกใช้",
  },
} as const;

export function DocumentationTemplate({
  styleFor,
  lang = "en",
  text,
  classNames,
  headingLevel = 1,
  children,
}: TemplateProps) {
  const { Title, Section, Sub } = headingTags(headingLevel);
  const copy = withSpecimenText(DOCUMENTATION[lang], text);
  const wrap = (value: string) => localizeCopy(lang, text, value);

  return (
    <article className={classNames?.documentation}>
      {/* Canned specimen only. The studio document is the page; a fake
          Foundations / Colour / Typography / Spacing list reads as real
          navigation sitting on top of copy you cannot edit. */}
      {!children && (
        <nav aria-label={copy.navLabel}>
          <p style={styleFor("label")}>{wrap(copy.navKicker)}</p>
          <p style={styleFor("caption")}>{wrap(copy.navColour)}</p>
          <p style={styleFor("caption")}>{wrap(copy.navType)}</p>
          <p style={styleFor("caption")}>{wrap(copy.navSpace)}</p>
        </nav>
      )}

      {children ?? (
        <>
          <p style={styleFor("label")}>{wrap(copy.kicker)}</p>
          <Title style={styleFor("display")}>{wrap(copy.title)}</Title>
          <p style={styleFor("title")}>{wrap(copy.standfirst)}</p>

          <Section style={styleFor("heading")}>{wrap(copy.heading)}</Section>
          <p style={styleFor("body")}>{wrap(copy.body)}</p>

          <Sub style={styleFor("title")}>{wrap(copy.subheading)}</Sub>
          <p style={styleFor("body")}>{wrap(copy.bodyTwo)}</p>

          <figure>
            <pre>
              <code style={styleFor("caption")}>{wrap(copy.snippet)}</code>
            </pre>
            <figcaption style={styleFor("caption")}>
              {wrap(copy.caption)}
            </figcaption>
          </figure>
        </>
      )}
    </article>
  );
}
