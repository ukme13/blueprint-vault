import { localizeCopy } from "./preview-template-text";
import {
  headingTags,
  withSpecimenText,
  type TemplateProps,
} from "./preview-template-shared";

const DASHBOARD = {
  en: {
    kicker: "Colour Studio",
    title: "Overview",
    navLabel: "Studio",
    navOverview: "Overview",
    navPalettes: "Palettes",
    navExport: "Export",
    metricsHeading: "This week",
    metricOneLabel: "Open files",
    metricOneValue: "12",
    metricOneHint: "across three workspaces",
    metricTwoLabel: "Roles in use",
    metricTwoValue: "48",
    metricTwoHint: "including caption",
    metricThreeLabel: "Last export",
    metricThreeValue: "2h",
    metricThreeHint: "CSS and Tailwind",
    listHeading: "Recent decisions",
    rowOneTitle: "Caption sits under body",
    rowOneBody:
      "A size with no job will be borrowed. Naming the quietest text stops kickers and footnotes from stealing the reading size.",
    rowTwoTitle: "Display is one step",
    rowTwoBody:
      "Heroes share a size. If a dashboard number needs to shout, it uses display; it does not invent a seventh role.",
    footnote: "Synced from this workspace a moment ago",
  },
  th: {
    kicker: "สตูดิโอสี",
    title: "ภาพรวม",
    navLabel: "สตูดิโอ",
    navOverview: "ภาพรวม",
    navPalettes: "จานสี",
    navExport: "ส่งออก",
    metricsHeading: "สัปดาห์นี้",
    metricOneLabel: "ไฟล์ที่เปิด",
    metricOneValue: "12",
    metricOneHint: "จากสามเวิร์กสเปซ",
    metricTwoLabel: "บทบาทที่ใช้",
    metricTwoValue: "48",
    metricTwoHint: "รวมแคปชัน",
    metricThreeLabel: "ส่งออกล่าสุด",
    metricThreeValue: "2 ชม.",
    metricThreeHint: "CSS และ Tailwind",
    listHeading: "การตัดสินใจล่าสุด",
    rowOneTitle: "แคปชันอยู่ใต้เนื้อหา",
    rowOneBody:
      "ขนาดที่ไม่มีหน้าที่จะถูกหยิบไปใช้ การตั้งชื่อข้อความที่เงียบที่สุดทำให้คิกเกอร์และเชิงอรรถไม่ไปแย่งขนาดที่ใช้อ่าน",
    rowTwoTitle: "Display มีขั้นเดียว",
    rowTwoBody:
      "พาดหัวใหญ่ใช้ขนาดร่วมกัน ถ้าตัวเลขบนแดชบอร์ดต้องเด่นก็ใช้ display ไม่ต้องประดิษฐ์บทบาทที่เจ็ด",
    footnote: "ซิงก์จากเวิร์กสเปซนี้เมื่อสักครู่",
  },
} as const;

export function DashboardTemplate({
  styleFor,
  lang = "en",
  text,
  classNames,
  headingLevel = 1,
}: TemplateProps) {
  const { Title, Section } = headingTags(headingLevel);
  const copy = withSpecimenText(DASHBOARD[lang], text);
  const wrap = (value: string) => localizeCopy(lang, text, value);
  const metrics = [
    {
      id: "files",
      label: copy.metricOneLabel,
      value: copy.metricOneValue,
      hint: copy.metricOneHint,
    },
    {
      id: "roles",
      label: copy.metricTwoLabel,
      value: copy.metricTwoValue,
      hint: copy.metricTwoHint,
    },
    {
      id: "export",
      label: copy.metricThreeLabel,
      value: copy.metricThreeValue,
      hint: copy.metricThreeHint,
    },
  ];

  return (
    <article className={classNames?.dashboard}>
      <header>
        <p style={styleFor("label")}>{wrap(copy.kicker)}</p>
        <Title style={styleFor("heading")}>{wrap(copy.title)}</Title>
      </header>

      <nav aria-label={copy.navLabel}>
        <p style={styleFor("label")}>{wrap(copy.navOverview)}</p>
        <p style={styleFor("label")}>{wrap(copy.navPalettes)}</p>
        <p style={styleFor("label")}>{wrap(copy.navExport)}</p>
      </nav>

      <section>
        <Section style={styleFor("title")}>{wrap(copy.metricsHeading)}</Section>
        <ul>
          {metrics.map((metric) => (
            <li key={metric.id}>
              <p style={styleFor("label")}>{wrap(metric.label)}</p>
              <p style={styleFor("display")}>{wrap(metric.value)}</p>
              <p style={styleFor("caption")}>{wrap(metric.hint)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Section style={styleFor("title")}>{wrap(copy.listHeading)}</Section>
        <p style={styleFor("title")}>{wrap(copy.rowOneTitle)}</p>
        <p style={styleFor("body")}>{wrap(copy.rowOneBody)}</p>
        <p style={styleFor("title")}>{wrap(copy.rowTwoTitle)}</p>
        <p style={styleFor("body")}>{wrap(copy.rowTwoBody)}</p>
      </section>

      <footer>
        <p style={styleFor("caption")}>{wrap(copy.footnote)}</p>
      </footer>
    </article>
  );
}
