// Shaders import as raw strings via the webpack `asset/source` rule (next.config).
declare module '*.glsl' {
  const content: string;
  export default content;
}
