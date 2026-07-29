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
    },
  },
};
