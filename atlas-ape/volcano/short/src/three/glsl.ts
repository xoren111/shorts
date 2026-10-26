// Shared GLSL snippets.

export const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
	vec2 i = floor(p); vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
	float v = 0.0; float a = 0.5;
	mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
	for (int k = 0; k < 5; k++) { v += a * vnoise(p); p = r * p * 2.03 + 17.1; a *= 0.5; }
	return v;
}
// cellular-ish crack pattern: distance to the nearest "plate" border
float cracks(vec2 p){
	vec2 i = floor(p); vec2 f = fract(p);
	float d1 = 8.0; float d2 = 8.0;
	for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
		vec2 g = vec2(float(x), float(y));
		vec2 o = vec2(hash12(i + g), hash12(i + g + 19.7));
		float d = length(g + o - f);
		if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
	}
	return d2 - d1;
}
`;

/** heat 0..1 → HDR lava colour (black crust → dark red → magenta → orange → gold → white-gold) */
export const LAVA_RAMP = /* glsl */ `
vec3 lavaRamp(float h){
	vec3 c0 = vec3(0.008, 0.005, 0.006);
	vec3 c1 = vec3(0.16, 0.012, 0.004);
	vec3 c2 = vec3(1.1, 0.1, 0.015);
	vec3 c3 = vec3(2.8, 0.55, 0.05);
	vec3 c4 = vec3(4.8, 2.3, 0.35);
	vec3 c5 = vec3(7.0, 5.2, 2.1);
	if (h < 0.15) return mix(c0, c1, h / 0.15);
	if (h < 0.35) return mix(c1, c2, (h - 0.15) / 0.2);
	if (h < 0.6) return mix(c2, c3, (h - 0.35) / 0.25);
	if (h < 0.85) return mix(c3, c4, (h - 0.6) / 0.25);
	return mix(c4, c5, (h - 0.85) / 0.15);
}
`;
