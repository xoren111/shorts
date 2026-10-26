import React, {useLayoutEffect, useMemo} from 'react';
import {getInputProps} from 'remotion';
import * as THREE from 'three';
import {LAVA_RAMP, NOISE} from './glsl';
import type {Region} from './region';

export type Look = {
	sunDir: [number, number, number];
	sunCol: string;
	sunI: number;
	skyCol: string;
	groundCol: string;
	ambI: number;
	fogCol: string;
	fogDens: number; // per km
	fogMax: number;
	satGain: number;
	saturation: number;
	contrast: number;
	night: number; // 0 dusk … 1 night
	waterCol: string;
	waterDeep: string;
	tint: string; // multiplied into the satellite colour (colour grade)
	expo?: number;
};

export const DUSK: Look = {
	sunDir: [-0.55, 0.3, -0.45],
	sunCol: '#ffb27a',
	sunI: 2.1,
	skyCol: '#2f5aa8',
	groundCol: '#20142c',
	ambI: 0.5,
	fogCol: '#6a4aa0',
	fogDens: 0.006,
	fogMax: 0.55,
	satGain: 1.0,
	saturation: 1.15,
	contrast: 1.15,
	night: 0,
	waterCol: '#06464f',
	waterDeep: '#041a33',
	tint: '#ffffff',
};

export type LavaState = {
	/** arrival progress per channel (R, G, B of lava.png): lava where arrival < prog */
	prog: [number, number, number];
	/** 0 = hot, 1 = fully cooled crust */
	cool: [number, number, number];
	gain: number;
	/** crust noise scale (1 / km) */
	noise: number;
	/** lava thickness raise (scene km) */
	thick: number;
	/** extra heat (0–0.5) for channels that must stay incandescent even when old/narrow (e.g. the 1935 channel at the vent) */
	hot?: number;
};

export const NO_LAVA: LavaState = {prog: [0, 0, 0], cool: [0, 0, 0], gain: 1, noise: 6, thick: 0};

export type Highlight = {x: number; z: number; r: number; strength: number; color: string};
/** earth bank across a valley (scene km): segment a→b, height h (already exaggerated scale), half-width w */
export type Berm = {ax: number; az: number; bx: number; bz: number; h: number; w: number};

const vert = /* glsl */ `
uniform sampler2D uLava; uniform float uHasLava; uniform vec3 uProg; uniform float uThick; uniform sampler2D uLavaEdge;
uniform vec4 uBerm; uniform vec2 uBermHW;
attribute float aH;
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vH; varying float vBerm;
float bermD(vec2 p){ vec2 a = uBerm.xy; vec2 b = uBerm.zw; vec2 d = b - a; float u = clamp(dot(p - a, d) / max(dot(d, d), 1e-9), 0.0, 1.0); return length(p - (a + u * d)); }
void main(){
	vUv = uv; vH = aH;
	vec3 p = position;
	vBerm = 0.0;
	if (uBermHW.x > 0.0) {
		float prof = 1.0 - smoothstep(uBermHW.y * 0.3, uBermHW.y, bermD(p.xz));
		p.y += uBermHW.x * prof;
		vBerm = prof;
	}
	if (uHasLava > 0.5) {
		vec3 L = texture(uLava, uv).rgb;
		float on = max(max(smoothstep(uProg.x + 0.002, uProg.x - 0.01, L.r), smoothstep(uProg.y + 0.002, uProg.y - 0.01, L.g)), 0.0);
		p.y += uThick * on * (0.25 + 0.75 * texture(uLavaEdge, uv).r);
	}
	vec4 w = modelMatrix * vec4(p, 1.0);
	vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform sampler2D uSat; uniform sampler2D uLava; uniform float uHasLava;
uniform vec3 uProg; uniform vec3 uCool; uniform float uLavaGain; uniform float uNoise; uniform float uTime; uniform float uHot;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunI; uniform vec3 uSkyCol; uniform vec3 uGroundCol; uniform float uAmbI;
uniform vec3 uFogCol; uniform float uFogDens; uniform float uFogMax;
uniform float uSatGain; uniform float uSaturation; uniform float uContrast; uniform float uNight; uniform vec3 uTint;
uniform vec3 uWaterCol; uniform vec3 uWaterDeep;
uniform vec4 uHL; uniform vec3 uHLCol; uniform float uOwnWater; uniform vec4 uInner; uniform float uExpo; uniform float uCloud; uniform float uDetail;
uniform sampler2D uNrm; uniform float uHasNrm; uniform sampler2D uLavaEdge; uniform sampler2D uLand; uniform float uHasLand;
uniform sampler2D uDRock; uniform sampler2D uDGrass; uniform sampler2D uDSoil; uniform sampler2D uDCliff; uniform sampler2D uNRock; uniform sampler2D uNGrass; uniform sampler2D uNSoil;
uniform float uHasDet; uniform vec2 uDetTile; uniform float uAA;
varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying float vH; varying float vBerm;
uniform vec4 uBerm; uniform vec2 uBermHW;
${NOISE}
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// anti-tiling lookup (I. Quilez «texture repetition», technique 3): a low-frequency noise picks one of 8 random offsets
// per region and blends neighbours, so a repeating photo tile never shows a grid
vec3 noTile(sampler2D t, vec2 uv){
	float k = vnoise(uv * 0.13);
	vec2 dx = dFdx(uv); vec2 dy = dFdy(uv);
	float l = k * 8.0; float f = fract(l); float ia = floor(l); float ib = ia + 1.0;
	vec2 oa = sin(vec2(3.0, 7.0) * ia); vec2 ob = sin(vec2(3.0, 7.0) * ib);
	vec3 a = textureGrad(t, uv + oa, dx, dy).rgb; vec3 b = textureGrad(t, uv + ob, dx, dy).rgb;
	return mix(a, b, smoothstep(0.2, 0.8, f - 0.1 * dot(a - b, vec3(1.0))));
}
// triplanar (steep faces use the side projections, so cliffs do not smear)
vec3 tri(sampler2D t, vec3 P, vec3 bw, float tile){ return noTile(t, P.zy / tile) * bw.x + noTile(t, P.xz / tile) * bw.y + noTile(t, P.xy / tile) * bw.z; }
${LAVA_RAMP}
vec3 lavaLayer(float a, float prog, float cool, float k, float e, inout float mask, out vec3 emis){
	// v4 (owner 18.10 «make the lava look like the real photos»): real flows are mostly a dark, glassy crust; the light
	// comes from glowing seams between crust plates (wide and yellow when young/hot, thin and red as they cool), from an
	// open incandescent river in the hottest core with dark rafts floating in it, and from the advancing front
	float on = smoothstep(prog + 0.002, prog - 0.012, a) * step(a, 0.995);
	float age = max(prog - a, 0.0);
	vec2 p = vW.xz * uNoise;
	float fw = length(fwidth(p));
	float lod = smoothstep(0.15, 0.6, fw);
	vec2 drift = vec2(0.0, -uTime * 0.03) * (1.0 - cool);          // cooled crust does not creep
	vec2 q = p + vec2(fbm(p * 0.35 + 1.7 + k), fbm(p * 0.35 + 8.3 - k)) * 2.6;   // domain warp → irregular plates
	float n = fbm(q * 0.3 + drift + k * 13.0);
	float macro = fbm(p * 0.06 + k * 3.0 + 0.5);                    // ~100 m patches: open melt vs crusted
	float c1 = cracks(q * 0.55 + k * 7.0);                          // crust plates
	float c2 = cracks(q * 1.8 + 11.0 + k);                          // fine crackle inside the plates
	float px1 = length(fwidth(q * 0.55)); float px2 = length(fwidth(q * 1.8));
	float front = 1.0 - smoothstep(0.0, 0.025, age);
	float young = 1.0 - smoothstep(0.0, 0.14, age);
	float core = smoothstep(0.15, 0.9, e);                          // 0 at the flow margin, 1 in the middle of the channel
	// how hot this spot still is: young lava, the channel core, warm patches; cooling takes it away
	// (an active channel stays molten in its core however long it has been flowing)
	float hot = clamp(0.45 * young + 0.62 * core * (1.0 - 0.45 * smoothstep(0.2, 0.8, age)) + (macro - 0.5) * 0.5 + (n - 0.5) * 0.35 + uHot, 0.0, 1.0) * (1.0 - cool);
	// seams widen with heat; anti-aliased (one pixel footprint) and faded to their mean coverage before they get thinner
	// than ~1.5 px, so nothing shimmers when the camera moves
	float w1 = mix(0.035, 0.2, hot); float w2 = mix(0.012, 0.06, hot);
	float l1 = 1.0 - smoothstep(0.0, w1 + px1 * uAA, c1);
	float l2 = 1.0 - smoothstep(0.0, w2 + px2 * uAA, c2);
	l1 = mix(l1, mix(min(1.0, w1 * 2.0), l1, 1.0 - smoothstep(0.04, 0.12, px1)), uAA);
	l2 = mix(l2, mix(min(1.0, w2 * 2.0), l2, 1.0 - smoothstep(0.03, 0.09, px2)), uAA);
	float seam = max(l1 * l1 * (0.7 + 0.3 * hot), 0.65 * l2 * l2 * hot);   // hottest in the middle of a seam
	// open melt where it is hottest: an incandescent surface with darker rafts (plate interiors) drifting in it
	float openM = smoothstep(0.52, 0.86, hot + 0.25 * (fbm(q * 0.22 + drift) - 0.5));
	float raft = (1.0 - l1) * smoothstep(0.42, 0.75, n);
	float melt = openM * (0.8 + 0.2 * fbm(q * 0.9 + drift * 2.0)) * (1.0 - 0.6 * raft);
	float hd = max(seam * mix(0.5, 1.0, hot), melt);
	hd = max(hd, front * 0.95 * (1.0 - cool));                       // a channel laid out cold (cool≈1) does not flash
	// far LOD (plates not resolvable): a dark flow with a glowing core river, warm patches and the bright front
	vec2 pl = vW.xz * 7.0;
	float nL = fbm(pl + vec2(fbm(pl * 0.5 + k), fbm(pl * 0.5 + 4.1)) * 1.6 + k * 5.0);
	float river = smoothstep(0.62, 0.95, e) * (1.0 - smoothstep(0.05, 0.4, age)) * (1.0 - cool);
	float ha = max(max(river * (0.78 + 0.25 * (nL - 0.5)), hot * (0.4 + 0.3 * nL)), front * 0.95 * (1.0 - cool));
	float heat = mix(hd, ha, lod);
	// fully cooled: black crust, a few seams keep a dull red glow
	float cooled = l1 * 0.3 * (1.0 - 0.6 * cool) * smoothstep(0.35, 0.65, n) * (1.0 - lod * 0.8);
	heat = mix(heat, cooled, smoothstep(0.35, 0.9, cool));
	heat *= 1.0 - 0.05 * (1.0 - cool) * (0.5 + 0.5 * sin(uTime * 1.6 + n * 9.0));   // slow breathing of hot lava only
	emis = lavaRamp(clamp(heat, 0.0, 1.0)) * uLavaGain * on * mix(1.0, 0.75, lod);
	mask = max(mask, on);
	return vec3(on);
}
void main(){
	vec3 gN = normalize(cross(dFdx(vW), dFdy(vW)));
	if (dot(gN, cameraPosition - vW) < 0.0) gN = -gN;
	vec2 uvS = vUv;
	bool seaCliff = false;
	// coast mask sampled with a 2× footprint: a 1–2 texel pier/quay otherwise flips between kept and discarded from frame
	// to frame as the camera moves (blinking); the wider box average makes the decision stable
	float landM = uHasLand > 0.5 ? textureGrad(uLand, vUv, dFdx(vUv) * 2.0, dFdy(vUv) * 2.0).r : 1.0;
	if (uHasLand > 0.5 && landM < 0.5) {
		// the 2 m coast mask is finer than the mesh: a sea-cliff triangle spans one cell from the cliff top down to a sea
		// vertex, and cutting it with the mask leaves the cliff hanging over the water in teeth. Steep faces above sea level
		// therefore ignore the mask and run down to the water (shaded with their own slope and the colour of the nearest
		// land texel, not the water pixels under them); flat ground (beaches, harbour) is cut by the mask.
		if (abs(gN.y) > 0.6 || vH <= 0.5) discard;
		seaCliff = true;
		vec2 px = 1.0 / vec2(textureSize(uLand, 0));
		float best = 1e9;
		for (int r = 1; r <= 4; r++) {
			for (int k = 0; k < 8; k++) {
				float a = float(k) * 0.7853982 + float(r) * 0.39;
				vec2 o = vec2(cos(a), sin(a)) * float(r) * 3.0 * px;
				if (texture(uLand, vUv + o).r > 0.5 && dot(o / px, o / px) < best) { best = dot(o / px, o / px); uvS = vUv + o * 1.5; }
			}
			if (best < 1e8) break;
		}
	}
	vec3 N = normalize(vN);
	if (uHasNrm > 0.5) N = normalize(texture(uNrm, vUv).xyz * 2.0 - 1.0);
	if (seaCliff) N = gN;
	vec3 sat = texture(uSat, uvS).rgb * uTint;
	float lum = luma(sat);
	// cloud removal (Hawaii mosaic): bright, colourless patches → local ground colour
	if (uCloud > 0.0) {
		float chroma = max(max(sat.r, sat.g), sat.b) - min(min(sat.r, sat.g), sat.b);
		float cl = smoothstep(0.12, 0.24, lum) * (1.0 - smoothstep(0.09, 0.17, chroma)) * uCloud;
		vec3 ground = mix(vec3(0.07, 0.085, 0.045), vec3(0.11, 0.075, 0.055), fbm(vW.xz * 0.4));
		sat = mix(sat, ground, cl);
		lum = luma(sat);
	}
	float camD = length(cameraPosition - vW);
	if (vBerm > 0.01) {
		// bulldozed volcanic earth on the bank; its flanks get a slope normal so it reads as a ridge in the low sun
		vec2 a = uBerm.xy; vec2 b = uBerm.zw; vec2 dd = b - a;
		float u = clamp(dot(vW.xz - a, dd) / max(dot(dd, dd), 1e-9), 0.0, 1.0);
		vec2 off = vW.xz - (a + u * dd);
		float dist = length(off);
		float slope = (1.0 - smoothstep(0.3, 1.0, dist / uBermHW.y)) * (smoothstep(0.25, 0.55, dist / uBermHW.y));
		N = normalize(N + vec3(normalize(off + 1e-6).x, 0.0, normalize(off + 1e-6).y) * slope * 1.6);
		vec3 soil = mix(vec3(0.075, 0.06, 0.05), vec3(0.17, 0.13, 0.1), fbm(vW.xz * 300.0)) * (0.8 + 0.4 * fbm(vW.xz * 1200.0));
		sat = mix(sat, soil, smoothstep(0.02, 0.35, vBerm));
	}
	if (uHasDet > 0.5) {
		// photographic micro-detail (CC0 Poly Haven tiles) as a luminance ratio on top of the satellite colour,
		// class weights from the satellite colour and the slope; fades out with distance and screen frequency
		float detW = (1.0 - smoothstep(1.5, 12.0, camD)) * uDetail;
		vec3 bw = pow(abs(N), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
		float green = sat.g - max(sat.r, sat.b);
		float wg = smoothstep(0.003, 0.025, green);
		float wr = clamp(smoothstep(0.8, 0.5, N.y) + smoothstep(0.08, 0.025, lum), 0.0, 1.0) * (1.0 - 0.6 * wg);
		float ws = max(0.0, 1.0 - wg - wr);
		float sw = wg + wr + ws + 1e-4; wg /= sw; wr /= sw; ws /= sw;
		// tile sizes (km) close to each photo's native scale × 3: rock 1.8 m → 6 m, soil 4 m → 12 m, aerial grass 80 m → 60 m
		float tR = 0.006; float tS = 0.012; float tG = 0.06;
		float fR = 1.0 - smoothstep(0.25, 0.9, length(fwidth(vW.xz / tR)));
		float fS = 1.0 - smoothstep(0.25, 0.9, length(fwidth(vW.xz / tS)));
		float fG = 1.0 - smoothstep(0.25, 0.9, length(fwidth(vW.xz / tG)));
		vec3 aR = textureLod(uDRock, vec2(0.5), 12.0).rgb; vec3 aG = textureLod(uDGrass, vec2(0.5), 12.0).rgb; vec3 aS = textureLod(uDSoil, vec2(0.5), 12.0).rgb;
		float dR = mix(1.0, luma(tri(uDRock, vW, bw, tR)) / max(luma(aR), 0.02), fR) * mix(1.0, luma(tri(uDRock, vW + 3.7, bw, tR * 5.0)) / max(luma(aR), 0.02), 0.5);
		float dG = mix(1.0, luma(noTile(uDGrass, vW.xz / tG)) / max(luma(aG), 0.02), fG) * mix(1.0, luma(noTile(uDGrass, vW.xz / (tG * 0.2) + 0.37)) / max(luma(aG), 0.02), 0.45 * (1.0 - smoothstep(0.25, 0.9, length(fwidth(vW.xz / (tG * 0.2))))));
		float dS = mix(1.0, luma(noTile(uDSoil, vW.xz / tS)) / max(luma(aS), 0.02), fS) * mix(1.0, luma(noTile(uDSoil, vW.xz / (tS * 4.0) + 0.71)) / max(luma(aS), 0.02), 0.5);
		float d = dR * wr + dG * wg + dS * ws;
		sat *= mix(1.0, clamp(d, 0.55, 1.6), detW * 0.75);
		vec3 tn = (noTile(uNRock, vW.xz / tR) * 2.0 - 1.0) * wr * fR + (noTile(uNGrass, vW.xz / tG) * 2.0 - 1.0) * wg * fG + (noTile(uNSoil, vW.xz / tS) * 2.0 - 1.0) * ws * fS;
		vec3 dnw = vec3(tn.x, 0.0, -tn.y);
		N = normalize(N + dnw * 0.6 * detW * bw.y);
		// steep faces: a top-down image smears into vertical streaks there → triplanar rock photo tinted by the local
		// (low-mip) satellite colour, so cliffs read as rock walls at any distance
		float cl = smoothstep(0.8, 0.52, N.y);
		if (cl > 0.001) {
			vec3 aC = textureLod(uDCliff, vec2(0.5), 12.0).rgb;
			vec3 rockC = tri(uDCliff, vW, bw, 0.03) / max(aC, vec3(0.02));
			vec3 rockF = tri(uDCliff, vW + 1.3, bw, 0.11) / max(aC, vec3(0.02));
			vec3 base = textureLod(uSat, uvS, 5.0).rgb * uTint;
			base = mix(vec3(luma(base)), base, 0.55) * 0.85;
			vec3 cliffCol = base * mix(vec3(1.0), rockC * 0.6 + rockF * 0.4, 0.85);
			sat = mix(sat, cliffCol, cl);
		}
		lum = luma(sat);
	} else {
		// fallback procedural micro detail
		float det = (fbm(vW.xz * 160.0) - 0.5) * 0.55 + (fbm(vW.xz * 600.0) - 0.5) * 0.35;
		sat *= 1.0 + det * (1.0 - smoothstep(0.6, 4.0, camD)) * uDetail;
	}
	sat = mix(vec3(lum), sat, uSaturation);
	sat = pow(max(sat, 0.0), vec3(uContrast)) * uSatGain;
	// steep faces (sea cliffs, crater walls): the satellite texture smears there → dark basalt rock instead
	float steep = smoothstep(0.55, 0.3, N.y);
	sat = mix(sat, vec3(0.06, 0.05, 0.055) * (0.8 + 0.4 * lum / max(0.05, lum + 0.05)), steep * (uHasDet > 0.5 ? 0.15 : 0.85));
	vec3 L = normalize(uSunDir);
	float ndl = max(dot(N, L), 0.0);
	vec3 hemi = mix(uGroundCol, uSkyCol, N.y * 0.5 + 0.5) * uAmbI;
	vec3 col = sat * (uSunCol * uSunI * ndl + hemi);
	col *= mix(1.0, 0.22, uNight);
	vec3 V = normalize(cameraPosition - vW);
	if (uHasLand < 0.5 && vH <= 0.0 && uOwnWater < 0.5) discard;
	if (uInner.y > uInner.x && vW.x > uInner.x && vW.x < uInner.y && vW.z > uInner.z && vW.z < uInner.w) discard;
	vec3 emis = vec3(0.0);
	float mask = 0.0;
	if (uHasLava > 0.5) {
		vec3 Lv = texture(uLava, vUv).rgb;
		// organic edges: wobble the arrival field (front) and the outer ramp of the mask (lateral edges)
		float wob = fbm(vW.xz * uNoise * 0.09) - 0.5;
		vec2 inside = step(Lv.rg, vec2(0.995));                         // 1 inside the (blurred) outline, 0 outside
		vec2 ramp = step(vec2(0.88), Lv.rg) * inside;                    // the soft outer rim of the outline
		Lv.rg = mix(Lv.rg, mix(Lv.rg + wob * 0.012, min(vec2(1.0), Lv.rg + wob * 0.3), ramp), inside);
		vec3 e1; vec3 e2; vec3 e3;
		float edgeD = texture(uLavaEdge, vUv).r;
		lavaLayer(Lv.r, uProg.x, uCool.x, 0.0, edgeD, mask, e1);
		lavaLayer(Lv.g, uProg.y, uCool.y, 1.0, edgeD, mask, e2);
		// channel B = eruptive fissure: a thin, very hot line
		float onF = smoothstep(uProg.z + 0.002, uProg.z - 0.012, Lv.b) * step(Lv.b, 0.995);
		e3 = lavaRamp(clamp(1.0 - uCool.z * 0.85, 0.0, 1.0)) * 1.4 * onF * uLavaGain;
		mask = max(mask, onF);
		emis = max(max(e1, e2), e3);
		// glow halo on nearby ground / water (blurred mip of the lava map)
		vec3 Lb = textureLod(uLava, vUv, 4.0).rgb;
		float halo = max(max(smoothstep(uProg.x + 0.05, uProg.x - 0.05, Lb.r) * (1.0 - uCool.x), smoothstep(uProg.y + 0.05, uProg.y - 0.05, Lb.g) * (1.0 - uCool.y)), smoothstep(uProg.z + 0.05, uProg.z - 0.05, Lb.b) * (1.0 - uCool.z));
		col += vec3(1.0, 0.28, 0.08) * halo * 0.14 * uLavaGain * (1.0 - mask) * (0.4 + uNight);
	}
	col *= uExpo;
	// lava crust: dark basalt with the glassy sheen of fresh pahoehoe (noise normal, faded out where it would alias)
	vec2 cp = vW.xz * uNoise * 1.3;
	float ch0 = fbm(cp); float chx = fbm(cp + vec2(0.06, 0.0)); float chz = fbm(cp + vec2(0.0, 0.06));
	float shF = 1.0 - smoothstep(0.25, 0.7, length(fwidth(cp)));
	vec3 cn = normalize(mix(N, normalize(vec3((ch0 - chx) * 12.0, 1.0, (ch0 - chz) * 12.0)), 0.8 * shF));
	float csp = pow(max(dot(reflect(-L, cn), V), 0.0), 20.0) * shF;
	vec3 basalt = vec3(0.03, 0.026, 0.025) * (0.45 + 0.9 * max(dot(cn, L), 0.0)) + hemi * 0.01 + uSunCol * uSunI * csp * 0.05;
	basalt *= mix(1.0, 0.22, uNight);
	col = mix(col, basalt, mask) + emis;
	// highlight ring (danger / target zone)
	if (uHL.w > 0.0) {
		float d = distance(vW.xz, uHL.xy);
		float ring = exp(-pow((d - uHL.z) / (uHL.z * 0.08), 2.0)) + 0.25 * (1.0 - smoothstep(0.0, uHL.z, d));
		col += uHLCol * ring * uHL.w * smoothstep(0.55, 0.8, N.y);
	}
	float dist = length(cameraPosition - vW);
	float f = (1.0 - exp(-dist * uFogDens)) * uFogMax;
	col = mix(col, uFogCol * mix(1.0, 0.35, uNight), f * (1.0 - mask * 0.6));
	gl_FragColor = vec4(col, 1.0);
}`;

const col = (c: string) => new THREE.Color(c);

export const TerrainMesh: React.FC<{region: Region; look: Look; lava?: LavaState; time: number; hl?: Highlight | null; frame?: Region; inner?: Region; level?: number; berm?: Berm | null; outer?: boolean}> = ({region, look, lava = NO_LAVA, time, hl, frame, inner, level = 1, berm, outer = true}) => {
	const geom = useMemo(() => {
		const {nx, ny} = region.meta;
		// a coarse surrounding grid is placed in the detailed region's frame (same km axes, same exaggeration)
		let gw = region.wKm, gh = region.hKm, cx = 0, cz = 0;
		if (frame) {
			const a = region.meta.mercator, b = frame.meta.mercator;
			gw = ((a.x1 - a.x0) / (b.x1 - b.x0)) * frame.wKm;
			gh = ((a.y1 - a.y0) / (b.y1 - b.y0)) * frame.hKm;
			cx = (((a.x0 + a.x1) / 2 - b.x0) / (b.x1 - b.x0) - 0.5) * frame.wKm;
			cz = (((a.y0 + a.y1) / 2 - b.y0) / (b.y1 - b.y0) - 0.5) * frame.hKm;
		}
		const ex = frame ? frame.exag : region.exag;
		const g = new THREE.PlaneGeometry(gw, gh, nx - 1, ny - 1);
		g.rotateX(-Math.PI / 2);
		if (frame) g.translate(cx, 0, cz);
		const pos = g.attributes.position as THREE.BufferAttribute;
		const aH = new Float32Array(nx * ny);
		for (let k = 0; k < nx * ny; k++) {
			let h = region.heights[k];
			// only the outermost grid sinks to sea level at its border (hides the end of the world); a middle grid whose border
			// lies inside the next coarser grid must keep its heights, or its edge becomes a sea-level trench across the land
			if (frame && outer) {
				const i = k % nx;
				const j = Math.floor(k / nx);
				const e = Math.min(i / (nx - 1), 1 - i / (nx - 1), j / (ny - 1), 1 - j / (ny - 1));
				const f = Math.min(1, e / 0.09);
				h = h > 0 ? h * f * f * (3 - 2 * f) : h;
			}
			aH[k] = h;
			pos.setY(k, (Math.max(h, 0) / 1000) * ex + (frame ? -0.006 * level : 0));
		}
		g.setAttribute('aH', new THREE.BufferAttribute(aH, 1));
		g.computeVertexNormals();
		return g;
	}, [region, frame, level, outer]);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader: vert,
				fragmentShader: frag,
				// with a coast mask the land decides on its own where the sea is: quays and pier bases sit at y = 0, coplanar with
				// the ocean plane, and z-fought with it (blinking pier). Pull the terrain slightly towards the camera so land wins.
				polygonOffset: !!region.land,
				polygonOffsetFactor: region.land ? -2 : 0,
				polygonOffsetUnits: region.land ? -8 : 0,
				uniforms: {
					uSat: {value: region.sat},
					uLava: {value: region.lava},
					uHasLava: {value: region.lava ? 1 : 0},
					uProg: {value: new THREE.Vector3()},
					uCool: {value: new THREE.Vector3()},
					uLavaGain: {value: 1},
					uNoise: {value: 6},
					uThick: {value: 0},
					uHot: {value: 0},
					uTime: {value: 0},
					uSunDir: {value: new THREE.Vector3()},
					uSunCol: {value: new THREE.Color()},
					uSunI: {value: 1},
					uSkyCol: {value: new THREE.Color()},
					uGroundCol: {value: new THREE.Color()},
					uAmbI: {value: 1},
					uFogCol: {value: new THREE.Color()},
					uFogDens: {value: 0},
					uFogMax: {value: 0},
					uSatGain: {value: 1},
					uSaturation: {value: 1},
					uContrast: {value: 1},
					uNight: {value: 0},
					uTint: {value: new THREE.Color()},
					uWaterCol: {value: new THREE.Color()},
					uWaterDeep: {value: new THREE.Color()},
					uHL: {value: new THREE.Vector4()},
					uHLCol: {value: new THREE.Color()},
					uOwnWater: {value: 0},
					uInner: {value: new THREE.Vector4(0, 0, 0, 0)},
					uBerm: {value: new THREE.Vector4(0, 0, 0, 0)},
					uBermHW: {value: new THREE.Vector2(0, 0.05)},
					uNrm: {value: region.normal},
					uLavaEdge: {value: region.lavaEdge},
					uLand: {value: region.land},
					uHasLand: {value: region.land && !frame ? 1 : 0},
					uHasNrm: {value: region.normal && !frame ? 1 : 0},
					uDRock: {value: region.detail?.rock ?? null},
					uDGrass: {value: region.detail?.grass ?? null},
					uDSoil: {value: region.detail?.soil ?? null},
					uDCliff: {value: region.detail?.cliff ?? null},
					uNRock: {value: region.detail?.rockN ?? null},
					uNGrass: {value: region.detail?.grassN ?? null},
					uNSoil: {value: region.detail?.soilN ?? null},
					uHasDet: {value: region.detail ? 1 : 0},
					uDetTile: {value: new THREE.Vector2(0.008, 0.036)},
					uExpo: {value: 1},
					uCloud: {value: (region.meta.cloud_removal ?? region.name.startsWith('hawaii')) ? 1 : 0},
					uAA: {value: (getInputProps() as {noAA?: boolean}).noAA ? 0 : 1},
					uDetail: {value: 1},
				},
			}),
		[region, frame],
	);
	useLayoutEffect(() => {
		const u = mat.uniforms;
		u.uProg.value.set(...lava.prog);
		u.uCool.value.set(...lava.cool);
		u.uLavaGain.value = lava.gain;
		u.uNoise.value = lava.noise;
		u.uThick.value = lava.thick;
		u.uHot.value = lava.hot ?? 0;
		u.uTime.value = time;
		u.uSunDir.value.set(...look.sunDir).normalize();
		u.uSunCol.value.copy(col(look.sunCol));
		u.uSunI.value = look.sunI;
		u.uSkyCol.value.copy(col(look.skyCol));
		u.uGroundCol.value.copy(col(look.groundCol));
		u.uAmbI.value = look.ambI;
		u.uFogCol.value.copy(col(look.fogCol));
		u.uFogDens.value = look.fogDens;
		u.uFogMax.value = look.fogMax;
		u.uSatGain.value = look.satGain;
		u.uSaturation.value = look.saturation;
		u.uContrast.value = look.contrast;
		u.uNight.value = look.night;
		u.uTint.value.copy(col(look.tint));
		u.uWaterCol.value.copy(col(look.waterCol));
		u.uWaterDeep.value.copy(col(look.waterDeep));
		if (hl) {
			u.uHL.value.set(hl.x, hl.z, hl.r, hl.strength);
			u.uHLCol.value.copy(col(hl.color));
		} else u.uHL.value.set(0, 0, 1, 0);
		u.uExpo.value = look.expo ?? 1;
		if (berm) {
			u.uBerm.value.set(berm.ax, berm.az, berm.bx, berm.bz);
			u.uBermHW.value.set(berm.h, berm.w);
		} else u.uBermHW.value.set(0, 0.05);
		if (frame) {
			// discard where the next finer grid (inner, default = the frame region itself) is drawn
			const f = frame;
			const n = inner ?? frame;
			const a = n.meta.mercator, b = f.meta.mercator;
			const x0 = ((a.x0 - b.x0) / (b.x1 - b.x0) - 0.5) * f.wKm, x1 = ((a.x1 - b.x0) / (b.x1 - b.x0) - 0.5) * f.wKm;
			const z0 = ((a.y0 - b.y0) / (b.y1 - b.y0) - 0.5) * f.hKm, z1 = ((a.y1 - b.y0) / (b.y1 - b.y0) - 0.5) * f.hKm;
			const m = Math.min(0.15, (x1 - x0) * 0.01);
			u.uInner.value.set(x0 + m, x1 - m, z0 + m, z1 - m);
		}
	});
	return <mesh geometry={geom} material={mat} frustumCulled={false} />;
};
