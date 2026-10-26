import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {NOISE} from './glsl';

/** One camera-facing sprite. kind: 0 glow (additive spark / ember / flash), 1 puff (smoke / steam / dust), 2 rock (debris) */
export type BB = {x: number; y: number; z: number; size: number; r: number; g: number; b: number; a: number; rot?: number; seed?: number; kind?: number; gr?: number; gg?: number; gb?: number; stretch?: number};

const vert = /* glsl */ `
attribute vec3 aPos; attribute vec4 aCol; attribute vec4 aMisc; attribute vec3 aGlow;
varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying vec3 vGlow;
void main(){
	vUv = position.xy + 0.5; vCol = aCol; vMisc = aMisc; vGlow = aGlow;
	vec4 mv = viewMatrix * vec4(aPos, 1.0);
	float c = cos(aMisc.x); float s = sin(aMisc.x);
	vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
	q.y *= aMisc.w;
	mv.xy += q * aMisc.y;
	gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying vec3 vGlow; uniform float uAdd;
${NOISE}
void main(){
	vec2 p = vUv - 0.5;
	float r = length(p) * 2.0;
	float kind = floor(vMisc.z + 0.001);
	float seed = fract(vMisc.z) * 100.0;
	vec4 o;
	if (kind < 0.5) {
		float a = exp(-r * r * 6.0) + 0.6 * exp(-r * r * 40.0);
		o = vec4(vCol.rgb * a, a * vCol.a);
		o.rgb *= vCol.a;
	} else if (kind < 1.5) {
		float n = fbm(p * 3.2 + seed);
		float n2 = fbm(p * 7.0 - seed * 1.7);
		float edge = r + (n - 0.5) * 0.75 + (n2 - 0.5) * 0.25;
		float a = smoothstep(0.95, 0.35, edge) * smoothstep(1.0, 0.72, r);
		float shade = 0.75 + 0.45 * (n - 0.5) + 0.25 * (0.5 - p.y);
		vec3 c = vCol.rgb * shade + vGlow * smoothstep(0.2, -0.5, p.y) * (0.6 + n);
		o = vec4(c, a * vCol.a);
	} else {
		float n = fbm(p * 4.0 + seed);
		float a = step(r + (n - 0.5) * 0.6, 0.62) * step(r, 0.95);
		vec3 c = vCol.rgb * (0.6 + 0.6 * n) + vGlow * (1.0 - r);
		o = vec4(c, a * vCol.a);
	}
	if (o.a < 0.003) discard;
	if (uAdd > 0.5 && kind > 0.5) o.rgb *= o.a;
	gl_FragColor = o;
}`;

/** Instanced camera-facing sprites; `fill` returns the sprites for this frame (deterministic, pure function of time). */
export const Billboards: React.FC<{max: number; items: BB[]; blending?: 'add' | 'normal'; renderOrder?: number; depthTest?: boolean}> = ({max, items, blending = 'add', renderOrder = 5, depthTest = true}) => {
	const {geom, mat} = useMemo(() => {
		const g = new THREE.InstancedBufferGeometry();
		const base = new THREE.PlaneGeometry(1, 1);
		g.index = base.index;
		g.setAttribute('position', base.attributes.position);
		g.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3));
		g.setAttribute('aCol', new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4));
		g.setAttribute('aMisc', new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4));
		g.setAttribute('aGlow', new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3));
		g.instanceCount = 0;
		const m = new THREE.ShaderMaterial({
			vertexShader: vert,
			fragmentShader: frag,
			transparent: true,
			depthWrite: false,
			depthTest,
			blending: blending === 'add' ? THREE.CustomBlending : THREE.NormalBlending,
			blendSrc: THREE.OneFactor,
			blendDst: THREE.OneFactor,
			blendEquation: THREE.AddEquation,
			premultipliedAlpha: blending === 'add',
			uniforms: {uAdd: {value: blending === 'add' ? 1 : 0}},
		});
		if (blending === 'add') {
			m.blending = THREE.CustomBlending;
			m.blendSrc = THREE.OneFactor;
			m.blendDst = THREE.OneFactor;
		}
		return {geom: g, mat: m};
	}, [max, blending, depthTest]);
	useLayoutEffect(() => {
		const P = geom.getAttribute('aPos') as THREE.InstancedBufferAttribute;
		const C = geom.getAttribute('aCol') as THREE.InstancedBufferAttribute;
		const M = geom.getAttribute('aMisc') as THREE.InstancedBufferAttribute;
		const G = geom.getAttribute('aGlow') as THREE.InstancedBufferAttribute;
		const n = Math.min(max, items.length);
		for (let i = 0; i < n; i++) {
			const b = items[i];
			P.setXYZ(i, b.x, b.y, b.z);
			C.setXYZW(i, b.r, b.g, b.b, b.a);
			M.setXYZW(i, b.rot ?? 0, b.size, (b.kind ?? 0) + ((b.seed ?? i * 0.137) % 1) * 0.98, b.stretch ?? 1);
			G.setXYZ(i, b.gr ?? 0, b.gg ?? 0, b.gb ?? 0);
		}
		P.needsUpdate = C.needsUpdate = M.needsUpdate = G.needsUpdate = true;
		geom.instanceCount = n;
	});
	return <mesh geometry={geom} material={mat} frustumCulled={false} renderOrder={renderOrder} />;
};
