/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Next's development badge sits bottom-left by default, which is exactly
     where the rail pins "Studio guide". Development only; a production build
     never shows it. */
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
