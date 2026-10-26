import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';

export type SkyLook = {top: string; mid: string; horizon: string; glow: string; sunDir: [number, number, number]; stars: number; glowI: number};

export const SKY_DUSK: SkyLook = {top: '#120a3a', mid: '#3b1c78', horizon: '#ff5a7a', glow: '#ffb347', sunDir: [-0.55, 0.06, -0.45], stars: 0.25, glowI: 1.6};
export const SKY_NIGHT: SkyLook = {top: '#02040f', mid: '#071436', horizon: '#1d2f6b', glow: '#ff4a1a', sunDir: [0.2, 0.0, -1], stars: 1, glowI: 0.5};

/** Sky dome (screen-filling, depth-less) — vertical gradient + horizon glow towards the sun + hash stars. */
export const Sky: React.FC<{look: SkyLook}> = ({look}) => {
	const camera = useThree((s) => s.camera);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {
					uTop: {value: new THREE.Color()},
					uMid: {value: new THREE.Color()},
					uHor: {value: new THREE.Color()},
					uGlow: {value: new THREE.Color()},
					uSun: {value: new THREE.Vector3()},
					uStars: {value: 0},
					uGlowI: {value: 1},
				},
				vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz); vec4 p = projectionMatrix * viewMatrix * vec4(cameraPosition + position, 1.0); gl_Position = p.xyww; }`,
				fragmentShader: /* glsl */ `
					uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uGlow; uniform vec3 uSun; uniform float uStars; uniform float uGlowI;
					varying vec3 vDir;
					float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
					void main(){
						vec3 d = normalize(vDir);
						float y = d.y;
						vec3 c = y > 0.18 ? mix(uMid, uTop, smoothstep(0.18, 0.75, y)) : mix(uHor, uMid, smoothstep(-0.05, 0.18, y));
						vec3 s = normalize(uSun);
						float g = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(s.x, 0.0, s.z))), 0.0);
						c += uGlow * pow(g, 6.0) * exp(-max(y, 0.0) * 7.0) * uGlowI;
						vec3 q = floor(d * 900.0);
						float st = step(0.9975, h(q)) * smoothstep(0.05, 0.4, y) * uStars;
						c += vec3(st) * (0.6 + 0.4 * h(q + 3.1)) * 2.0;
						gl_FragColor = vec4(c, 1.0);
					}`,
				side: THREE.BackSide,
				depthWrite: false,
				depthTest: false,
			}),
		[],
	);
	useLayoutEffect(() => {
		const u = mat.uniforms;
		u.uTop.value.set(look.top);
		u.uMid.value.set(look.mid);
		u.uHor.value.set(look.horizon);
		u.uGlow.value.set(look.glow);
		u.uSun.value.set(...look.sunDir);
		u.uStars.value = look.stars;
		u.uGlowI.value = look.glowI;
	});
	return (
		<mesh material={mat} renderOrder={-1000} frustumCulled={false} scale={[100, 100, 100]} userData={{cam: camera.uuid}}>
			<sphereGeometry args={[1, 32, 16]} />
		</mesh>
	);
};
