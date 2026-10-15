/**
 * PostCSS config for Tailwind CSS v4. Using the PostCSS plugin (rather than the
 * turbopack-only loader) so `@theme`, `@plugin`, and `@custom-variant` are
 * processed consistently in both dev and production builds.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
