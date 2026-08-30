import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Google-adjacent palette (blue / red / yellow / green)
        gblue: "#4285F4",
        gred: "#EA4335",
        gyellow: "#FBBC04",
        ggreen: "#34A853",
        panel: "#0f1420",
        panel2: "#161c2c",
        muted: "#8a94ad",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
