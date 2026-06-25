// Vault fragment shader (UI.md §5). Three real signals, never decoration:
//  - a vertical fill mask driven by real fundsRaised/target,
//  - a Fresnel rim for the cheap "expensive" look,
//  - a gold seam pulse fired once per milestone release, plus a gold rim while
//    the campaign is unlocking.
// Flat (faceted) normals come from screen-space derivatives of the view position.
// (Three injects the float precision qualifier ahead of this in GLSL3 mode.)

uniform float uFillLevel; // 0..1 waterline
uniform float uSeamPulse; // 0..1 gold edge flash, decays after a release
uniform float uUnlock; // 0..1 ambient gold while unlocking
uniform float uPlaceholder; // 0..1 desaturation for mocked (non-live) data
uniform float uFresnelPow; // rim falloff (~3.0)
uniform vec3 uColorBase; // panel
uniform vec3 uColorFill; // signal — the filled mass below the waterline
uniform vec3 uColorData; // cyan — rim glow and the glowing waterline edge
uniform vec3 uColorGold; // gold-unlock
uniform vec3 uColorMist; // mist, for the placeholder treatment

in vec3 vBary;
in vec3 vLocalPos;
in vec3 vViewPos;

out vec4 fragColor;

// 1.0 on a triangle edge, 0.0 in its interior — anti-aliased via fwidth.
float edgeFactor(vec3 b) {
  vec3 d = fwidth(b);
  vec3 a = smoothstep(vec3(0.0), d * 1.5, b);
  return 1.0 - min(min(a.x, a.y), a.z);
}

void main() {
  vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  vec3 viewDir = normalize(-vViewPos);

  // Vertical fill: local Y in [-1,1] -> [0,1], soft waterline.
  float h = (vLocalPos.y + 1.0) * 0.5;
  float fill = smoothstep(uFillLevel - 0.02, uFillLevel + 0.02, h);
  vec3 col = mix(uColorFill, uColorBase, fill); // filled (signal) below the line

  // A glowing cyan band right at the waterline — the data level reads as energy.
  float band = smoothstep(0.06, 0.0, abs(h - uFillLevel));
  col += uColorData * band * 0.6;

  // Fresnel rim glow in the cyan data accent for two-tone depth.
  float fres = pow(1.0 - max(dot(n, viewDir), 0.0), uFresnelPow);
  col += uColorData * fres * 0.6;
  col += uColorGold * fres * uUnlock * 0.5; // gold rim while unlocking

  // Seam definition: a constant hairline, plus the gold release pulse.
  float seam = edgeFactor(vBary);
  col = mix(col, uColorBase * 1.5, seam * 0.10);
  col = mix(col, uColorGold, seam * clamp(uSeamPulse + uUnlock * 0.4, 0.0, 1.0));

  // Mocked data renders desaturated toward mist so it never looks live.
  col = mix(col, uColorMist, uPlaceholder * 0.45);

  fragColor = vec4(col, 1.0);
}
