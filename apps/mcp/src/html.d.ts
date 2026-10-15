// Wrangler bundles .html imports as text (default Text module rule).
declare module "*.html" {
  const text: string;
  export default text;
}
