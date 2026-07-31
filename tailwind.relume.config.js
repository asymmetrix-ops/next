/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/landing-test-version1/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@relume_io/relume-ui/dist/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require("@relume_io/relume-tailwind")],
  theme: {
    extend: {
      colors: {
        background: {
          alternative: "hsl(228, 85%, 63%)",
        },
        border: {
          primary: "hsl(228, 85%, 55%)",
        },
        link: {
          primary: "hsl(228, 85%, 63%)",
        },
      },
      // The base Relume container caps at 1280px with no wider breakpoint,
      // so anything past that leaves large empty gutters on big screens.
      container: {
        screens: {
          xl: "1440px",
          xxl: "1800px",
        },
      },
    },
  },
};
