"use client";

import { Suspense } from "react";
import { TypographyStudio } from "../../components/typography/TypographyStudio";

/* The studio reads the view and tab from the query string, which a
   prerendered page may only do inside a Suspense boundary. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <TypographyStudio />
    </Suspense>
  );
}
