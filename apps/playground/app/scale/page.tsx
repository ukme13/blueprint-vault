import { redirect } from "next/navigation";

/** Legacy `/scale` lands on Spacing, now a rail item of its own. */
export default function ScaleRedirect() {
  redirect("/spacing");
}
