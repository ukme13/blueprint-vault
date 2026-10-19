import { ColourFormatProvider } from "../../components/palette/ColourFormatContext";
import { MotionStudio } from "../../components/motion/MotionStudio";

export default function MotionPage() {
  return (
    <ColourFormatProvider>
      <MotionStudio />
    </ColourFormatProvider>
  );
}
