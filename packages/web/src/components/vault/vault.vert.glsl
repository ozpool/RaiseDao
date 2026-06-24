// Vault vertex shader. Displaces an icosphere along its normals with cheap value
// noise to read as a faceted "protocol" object, and passes barycentric coords so
// the fragment stage can light the triangle seams. Flat normals are reconstructed
// in the fragment shader from derivatives, so we don't recompute them here.

in vec3 bary;

out vec3 vBary;
out vec3 vLocalPos;
out vec3 vViewPos;

// Hash-based 3D value noise — no texture, no lib. Good enough for a static,
// low-frequency surface displacement.
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

void main() {
  vBary = bary;

  // Static displacement (shape is fixed; the mesh rotates around Y at the group
  // level, which keeps the vertical fill waterline horizontal in world space).
  float n = noise(position * 1.7) - 0.5;
  vec3 displaced = position + normal * n * 0.22;

  vLocalPos = displaced;
  vec4 viewPos = modelViewMatrix * vec4(displaced, 1.0);
  vViewPos = viewPos.xyz;
  gl_Position = projectionMatrix * viewPos;
}
