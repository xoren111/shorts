import React, {useMemo, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import type {Cam, V3} from './cam';
import {Sky} from './Sky';
import {Stage3D} from './Stage3D';

/** unit-sphere direction for lat/lon (matches THREE.SphereGeometry's equirectangular UVs) */
export const dirLL = (lat: number, lon: number, r = 1): V3 => {
	const a = (lat * Math.PI) / 180;
	const o = (lon * Math.PI) / 180;
	return [r * Math.cos(a) * Math.cos(o), r * Math.sin(a), -r * Math.cos(a) * Math.sin(o)];
};

/** camera above lat/lon at distance d (globe radius 1); tilt (deg) moves the camera south so the view is oblique */
export const globeCam = (lat: number, lon: number, d: number, fov = 35, tilt = 0, roll = 0): Cam => ({pos: dirLL(lat - tilt, lon, d), target: dirLL(lat, lon, 1), fov, roll});

type GT = {day: THREE.Texture; night: THREE.Texture; water: THREE.Texture | null};
let texCache: Promise<GT> | null = null;
let texDone: GT | null = null;
const loadGlobeTex = () => {
	if (!texCache) {
		const ld = (u: string) =>
			new Promise<THREE.Texture>((res, rej) =>
				new THREE.TextureLoader().load(
					u,
					(t) => {
						t.colorSpace = THREE.SRGBColorSpace;
						t.anisotropy = 8;
						res(t);
					},
					undefined,
					rej,
				),
			);
		const water = fetch(staticFile('globe/water.png'), {method: 'HEAD'})
			.then((r) => (r.ok ? ld(staticFile('globe/water.png')) : null))
			.then((t) => {
				if (t) t.colorSpace = THREE.NoColorSpace;
				return t;
			})
			.catch(() => null);
		texCache = Promise.all([ld(staticFile('globe/day.jpg')), ld(staticFile('globe/night.jpg')), water]).then(([day, night, w]) => (texDone = {day, night, water: w}));
	}
	return texCache;
};

const useGlobeTex = () => {
	const [tex, setTex] = useState(texDone);
	const [h] = useState(() => (texDone ? null : delayRender('globe textures', {timeoutInMilliseconds: 120000})));
	React.useEffect(() => {
		if (!h) return;
		loadGlobeTex().then((t) => setTex(t));
	}, [h]);
	React.useEffect(() => {
		if (tex && h) continueRender(h);
	}, [tex, h]);
	return tex;
};

const Earth: React.FC<{day: THREE.Texture; night: THREE.Texture; water: THREE.Texture | null; sun: V3}> = ({day, night, water, sun}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uDay: {value: day}, uNight: {value: night}, uWater: {value: water}, uHasWater: {value: water ? 1 : 0}, uSun: {value: new THREE.Vector3()}},
				vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
				fragmentShader: `uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uWater; uniform float uHasWater; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
					void main(){
						vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); vec3 L = normalize(uSun);
						vec3 d = texture2D(uDay, vUv).rgb;
						float lum = dot(d, vec3(0.2126, 0.7152, 0.0722));
						float ocean = uHasWater > 0.5 ? texture2D(uWater, vUv).r : step(d.r * 1.4, d.b) * step(d.g * 1.05, d.b);
						d = mix(vec3(lum), d, 1.35);
						d = mix(d, vec3(0.02, 0.13, 0.24) + d * vec3(0.3, 0.8, 1.0), ocean * 0.55);
						float ndl = dot(N, L);
						float day = smoothstep(-0.15, 0.35, ndl);
						vec3 c = d * (0.1 + 1.25 * day);
						vec3 nl = texture2D(uNight, vUv).rgb;
						c += nl * vec3(1.6, 0.9, 0.45) * (1.0 - day) * 1.2;
						float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
						c += vec3(0.25, 0.55, 1.2) * fres * (0.25 + 0.75 * day);
						vec3 H = normalize(L + V);

						gl_FragColor = vec4(c, 1.0);
					}`,
			}),
		[day, night, water],
	);
	mat.uniforms.uSun.value.set(...sun).normalize();
	return (
		<mesh material={mat}>
			<sphereGeometry args={[1, 128, 64]} />
		</mesh>
	);
};

const Atmosphere: React.FC<{sun: V3}> = ({sun}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uSun: {value: new THREE.Vector3()}},
				vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
				fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
					float k = pow(max(0.0, 1.0 + dot(N, V) * 1.0 - 0.38), 3.0);
					float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.6, dot(N, normalize(uSun)));
					gl_FragColor = vec4(mix(vec3(0.2, 0.5, 1.4), vec3(0.6, 0.3, 1.2), 0.35) * k * 2.2 * lit, 1.0); }`,
				side: THREE.BackSide,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);
	mat.uniforms.uSun.value.set(...sun).normalize();
	return (
		<mesh material={mat} scale={1.09}>
			<sphereGeometry args={[1, 96, 48]} />
		</mesh>
	);
};

export type GlobeMarker = {lat: number; lon: number; color: string; size: number; pulse: number; alpha: number};
export type GlobeArc = {a: [number, number]; b: [number, number]; prog: number; color: string; height?: number};

const Marker: React.FC<{m: GlobeMarker}> = ({m}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uC: {value: new THREE.Color()}, uP: {value: 0}, uA: {value: 1}},
				vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform vec3 uC; uniform float uP; uniform float uA; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0;
					float dot0 = exp(-r * r * 40.0) * 2.0; float ring = exp(-pow((r - fract(uP)) / 0.06, 2.0)) * (1.0 - fract(uP));
					gl_FragColor = vec4(uC * (dot0 + ring * 1.6) * uA * 2.0, 1.0); }`,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);
	mat.uniforms.uC.value.set(m.color);
	mat.uniforms.uP.value = m.pulse;
	mat.uniforms.uA.value = m.alpha;
	const p = dirLL(m.lat, m.lon, 1.003);
	const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...p).normalize());
	return (
		<mesh material={mat} position={p} quaternion={q} scale={m.size} renderOrder={5}>
			<planeGeometry args={[1, 1]} />
		</mesh>
	);
};

const Arc: React.FC<{arc: GlobeArc}> = ({arc}) => {
	const geom = useMemo(() => {
		const A = new THREE.Vector3(...dirLL(arc.a[0], arc.a[1]));
		const B = new THREE.Vector3(...dirLL(arc.b[0], arc.b[1]));
		const pts: THREE.Vector3[] = [];
		const ang = A.angleTo(B);
		for (let i = 0; i <= 96; i++) {
			const t = i / 96;
			const v = new THREE.Vector3().copy(A).multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(new THREE.Vector3().copy(B).multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
			v.normalize().multiplyScalar(1.004 + (arc.height ?? 0.18) * Math.sin(Math.PI * t));
			pts.push(v);
		}
		return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.006, 8, false);
	}, [arc.a, arc.b, arc.height]);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uC: {value: new THREE.Color()}, uP: {value: 0}},
				vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform vec3 uC; uniform float uP; varying vec2 vUv; void main(){ if (vUv.x > uP) discard; float head = exp(-pow((vUv.x - uP) / 0.03, 2.0)); gl_FragColor = vec4(uC * (1.2 + head * 6.0), 1.0); }`,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		[],
	);
	mat.uniforms.uC.value.set(arc.color);
	mat.uniforms.uP.value = arc.prog;
	if (arc.prog <= 0) return null;
	return <mesh geometry={geom} material={mat} renderOrder={6} />;
};

export const SPACE = {top: '#02020a', mid: '#060a24', horizon: '#0c1236', glow: '#000000', sunDir: [0, 0, 1] as V3, stars: 1.2, glowI: 0};

export const GlobeScene: React.FC<{cam: Cam; sun: V3; markers?: GlobeMarker[]; arcs?: GlobeArc[]}> = ({cam, sun, markers = [], arcs = []}) => {
	const tex = useGlobeTex();
	if (!tex) return null;
	return (
		<Stage3D cam={cam} near={0.005} far={50} post={{bloom: 0.6, threshold: 1.0, vignette: 0.55}}>
			<Sky look={SPACE} />
			<Earth day={tex.day} night={tex.night} water={tex.water} sun={sun} />
			<Atmosphere sun={sun} />
			{markers.map((m, i) => (
				<Marker key={i} m={m} />
			))}
			{arcs.map((a, i) => (
				<Arc key={i} arc={a} />
			))}
		</Stage3D>
	);
};
