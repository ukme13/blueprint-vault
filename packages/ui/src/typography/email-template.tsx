import { localizeCopy } from "./preview-template-text";
import {
  headingTags,
  withSpecimenText,
  type TemplateProps,
} from "./preview-template-shared";

const EMAIL = {
  en: {
    preheader: "A note from the Blueprint team",
    from: "From: Blueprint",
    subject: "Subject: Your type scale is ready to export",
    title: "The sizes are decided. The file is next.",
    greeting: "Hello,",
    heading: "What this file will hold",
    bodyOne:
      "The scale in this workspace now has a job for every step, including the quiet ones. Export writes those decisions as tokens — rem by default, so a reader's own font size still works.",
    bodyTwo:
      "Nothing in this note is a token. It is a layout for judging whether the sizes hold together in a short message, a greeting, a button label and the small print underneath.",
    cta: "Open the export dialog",
    footer:
      "You are seeing this because you opened Typography Studio. It is not a real message.",
  },
  th: {
    preheader: "ข้อความจากทีม Blueprint",
    from: "จาก: Blueprint",
    subject: "เรื่อง: สเกลตัวอักษรพร้อมส่งออกแล้ว",
    title: "ขนาดตัดสินใจแล้ว ขั้นต่อไปคือไฟล์",
    greeting: "สวัสดี",
    heading: "ไฟล์นี้จะเก็บอะไร",
    bodyOne:
      "สเกลในเวิร์กสเปซนี้มีหน้าที่ให้ทุกขั้น รวมถึงขั้นที่เงียบ Export เขียนการตัดสินใจนั้นเป็นโทเคน — ค่าเริ่มเป็น rem เพื่อให้ขนาดตัวอักษรของผู้อ่านยังทำงาน",
    bodyTwo:
      "จดหมายนี้ไม่ใช่โทเคน เป็นเลย์เอาต์สำหรับดูว่าขนาดเข้ากันในข้อความสั้น คำทักทาย ป้ายปุ่ม และตัวพิมพ์เล็กด้านล่างหรือไม่",
    cta: "เปิดกล่องส่งออก",
    footer: "คุณเห็นข้อความนี้เพราะเปิด Typography Studio ไม่ใช่จดหมายจริง",
  },
} as const;

export function EmailTemplate({
  styleFor,
  lang = "en",
  text,
  classNames,
  headingLevel = 1,
  children,
}: TemplateProps) {
  const { Title, Section } = headingTags(headingLevel);
  const copy = withSpecimenText(EMAIL[lang], text);
  const wrap = (value: string) => localizeCopy(lang, text, value);

  return (
    <article className={classNames?.email}>
      <header>
        <p style={styleFor("label")}>{wrap(copy.preheader)}</p>
        <p style={styleFor("label")}>{wrap(copy.from)}</p>
        <p style={styleFor("caption")}>{wrap(copy.subject)}</p>
      </header>

      {children ?? (
        <>
          <Title style={styleFor("display")}>{wrap(copy.title)}</Title>
          <p style={styleFor("title")}>{wrap(copy.greeting)}</p>

          <Section style={styleFor("heading")}>{wrap(copy.heading)}</Section>
          <p style={styleFor("body")}>{wrap(copy.bodyOne)}</p>
          <p style={styleFor("body")}>{wrap(copy.bodyTwo)}</p>

          <p style={styleFor("label")}>{wrap(copy.cta)}</p>
        </>
      )}

      <footer>
        <small style={styleFor("caption")}>{wrap(copy.footer)}</small>
      </footer>
    </article>
  );
}
