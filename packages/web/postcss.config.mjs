/** Tailwind v4 runs as a PostCSS plugin; no tailwind.config file — the theme is
 *  declared in CSS via the `@theme` block in src/styles/tokens.css. */
const config = {
  plugins: { '@tailwindcss/postcss': {} },
};

export default config;
