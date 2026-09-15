/**
 * Copy is written for Blueprint. Templates exist to show the scale doing a
 * real job, so the text is realistic rather than lorem ipsum. The
 * documentation still has a Thai version: a scale that reads well in English
 * can still crowd Thai marks. The studio document seeds from the English
 * article.
 */
export const ARTICLE_COPY = {
  en: {
    kicker: "Design systems",
    title: "A type scale is a set of decisions, not a set of sizes",
    standfirst:
      "Choosing a ratio is the easy part. The work is deciding what each size is for, and holding that line as a product grows.",
    byline: "Blueprint team",
    headingOne: "Start from the reading size",
    bodyOne:
      "Body text is the size most people spend the most time with, so it should be chosen first and everything else derived from it. Picking a display size first tends to produce scales that look impressive in a specimen and read badly in a paragraph.",
    headingTwo: "Give every step a job",
    bodyTwo:
      "A step that has no purpose will be used for something eventually, and usually for the wrong thing. Fewer, well-named sizes are easier to hold to than a long ramp of near-identical values.",
    quote:
      "If two sizes are close enough that nobody can tell them apart, they are not two sizes.",
    caption: "Figure 1 — the same paragraph set at three neighbouring steps",
  },
  th: {
    kicker: "ระบบการออกแบบ",
    title: "สเกลตัวอักษรคือชุดการตัดสินใจ ไม่ใช่แค่ชุดของขนาด",
    standfirst:
      "การเลือกอัตราส่วนเป็นเรื่องง่าย งานจริงคือการตัดสินใจว่าแต่ละขนาดมีไว้เพื่ออะไร และรักษาเส้นนั้นไว้เมื่อผลิตภัณฑ์เติบโตขึ้น",
    byline: "ทีม Blueprint",
    headingOne: "เริ่มจากขนาดที่ใช้อ่าน",
    bodyOne:
      "ข้อความเนื้อหาคือขนาดที่คนใช้เวลากับมันมากที่สุด จึงควรเลือกก่อนแล้วค่อยคำนวณขนาดอื่นจากตรงนั้น การเลือกขนาดพาดหัวก่อนมักได้สเกลที่ดูดีในหน้าตัวอย่างแต่อ่านยากในย่อหน้าจริง",
    headingTwo: "ให้ทุกขั้นมีหน้าที่ของมัน",
    bodyTwo:
      "ขั้นที่ไม่มีจุดประสงค์จะถูกนำไปใช้กับบางอย่างในที่สุด และมักเป็นสิ่งที่ผิด ขนาดที่น้อยลงแต่ตั้งชื่อไว้ดีย่อมรักษาได้ง่ายกว่าลำดับขนาดยาวที่ใกล้เคียงกันไปหมด",
    quote: "ถ้าสองขนาดใกล้กันจนไม่มีใครแยกออก นั่นก็ไม่ใช่สองขนาด",
    caption: "ภาพที่ 1 — ย่อหน้าเดียวกันจัดด้วยสามขั้นที่อยู่ติดกัน",
  },
} as const;

export type ArticleCopy = { [K in keyof (typeof ARTICLE_COPY)["en"]]: string };
