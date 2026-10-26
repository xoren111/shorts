import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {NOISE} from './glsl';
import type {Region} from './region';
import type {Look} from './TerrainMesh';
import type {SkyLook} from './Sky';

/** Endless sea at y = 0 that follows the camera (the terrain discards its own water fragments). Fresnel sky reflection,
 *  sun glint, procedural waves and the orange reflection of nearby lava (blurred mip of the region's lava map). */
export const Ocean: React.FC<{region: Region; look: Look; time: number; prog: [number, number, number]; cool: [number, number, number]; glow?: number; horizon?: string; sky?: SkyLook}> = ({
	region,
	look,
	time,
	prog,
	cool,
	glow = 1,
	horizon = '#6a4a9a',
	sky,
}) => {
	const camera = useThree((s) => s.camera);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {
					uLava: {value: region.lava},
					uHasLava: {value: region.lava ? 1 : 0},
					uWK: {value: new THREE.Vector2(region.wKm, region.hKm)},
					uProg: {value: new THREE.Vector3()},
					uCool: {value: new THREE.Vector3()},
					uTime: {value: 0},
					uSunDir: {value: new THREE.Vector3()},
					uSunCol: {value: new THREE.Color()},
					uSunI: {value: 1},
					uSkyCol: {value: new THREE.Color()},
					uFogCol: {value: new THREE.Color()},
					uFogDens: {value: 0},
					uFogMax: {value: 0},
					uNight: {value: 0},
					uWater: {value: new THREE.Color()},
					uDeep: {value: new THREE.Color()},
					uGlow: {value: 1},
					uHorizon: {value: new THREE.Color()},
					uSkyGlow: {value: new THREE.Color()},
					uSkySun: {value: new THREE.Vector3(0, 0, 1)},
					uSkyGlowI: {value: 0},
				},
				vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
				fragmentShader: /* glsl */ `
					uniform sampler2D uLava; uniform float uHasLava; uniform vec2 uWK; uniform vec3 uProg; uniform vec3 uCool; uniform float uTime;
					uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunI; uniform vec3 uSkyCol; uniform vec3 uFogCol; uniform float uFogDens; uniform float uFogMax;
					uniform float uNight; uniform vec3 uWater; uniform vec3 uDeep; uniform float uGlow; uniform vec3 uHorizon; uniform vec3 uSkyGlow; uniform vec3 uSkySun; uniform float uSkyGlowI;
					varying vec3 vW;
					${NOISE}
					void main(){
						vec3 V = normalize(cameraPosition - vW);
						float dist = length(cameraPosition - vW);
						float fine = 1.0 - smoothstep(2.0, 12.0, dist);
						float micro = 1.0 - smoothstep(0.4, 3.0, dist);
						vec2 q = vW.xz;
						float e = 0.002;
						float h0 = fbm(q * 9.0 + vec2(uTime * 0.25, uTime * 0.12)) * 0.6 + fbm(q * 60.0 + vec2(-uTime * 0.6, uTime * 0.4)) * 0.4 * fine;
						float hx = fbm((q + vec2(e, 0.0)) * 9.0 + vec2(uTime * 0.25, uTime * 0.12)) * 0.6 + fbm((q + vec2(e, 0.0)) * 60.0 + vec2(-uTime * 0.6, uTime * 0.4)) * 0.4 * fine;
						float hz = fbm((q + vec2(0.0, e)) * 9.0 + vec2(uTime * 0.25, uTime * 0.12)) * 0.6 + fbm((q + vec2(0.0, e)) * 60.0 + vec2(-uTime * 0.6, uTime * 0.4)) * 0.4 * fine;
						vec3 N = normalize(vec3(-(hx - h0) / e * 0.004, 1.0, -(hz - h0) / e * 0.004));
						// close-up ripples
						float m0 = fbm(q * 260.0 + vec2(uTime * 0.9, -uTime * 0.7));
						N = normalize(N + vec3(m0 - 0.5, 0.0, fbm(q.yx * 260.0 - uTime * 0.8) - 0.5) * 0.25 * micro);
						float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
						vec3 L = normalize(uSunDir);
						vec3 R = reflect(-V, N);
						float glint = pow(max(dot(R, L), 0.0), 220.0) * 3.0 + pow(max(dot(R, L), 0.0), 18.0) * 0.12;
						vec3 col = mix(uWater, uDeep, smoothstep(0.0, 1.0, 1.0 - V.y)) * mix(1.0, 0.35, uNight);
						col += uSkyCol * fres * 0.6 * mix(1.0, 0.25, uNight) + uSunCol * glint * uSunI * (1.0 - uNight * 0.9);
						if (uHasLava > 0.5) {
							vec2 uv = vec2(vW.x / uWK.x + 0.5, 1.0 - (vW.z / uWK.y + 0.5));
							if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
								vec3 Lb = textureLod(uLava, uv, 3.5).rgb;
								float halo = max(max(smoothstep(uProg.x + 0.06, uProg.x - 0.06, Lb.r) * (1.0 - uCool.x), smoothstep(uProg.y + 0.06, uProg.y - 0.06, Lb.g) * (1.0 - uCool.y)), smoothstep(uProg.z + 0.06, uProg.z - 0.06, Lb.b) * (1.0 - uCool.z));
								col += vec3(1.6, 0.35, 0.08) * halo * (0.04 + 0.22 * fres) * uGlow;
							}
						}
						float f = (1.0 - exp(-dist * uFogDens)) * uFogMax;
						col = mix(col, uFogCol * mix(1.0, 0.35, uNight), f);
						// far sea melts into the sky's horizon colour: no hard sea/sky seam
						vec3 vd = normalize(vW - cameraPosition);
						float gs = max(dot(normalize(vec3(vd.x, 0.0, vd.z)), normalize(vec3(uSkySun.x, 0.0, uSkySun.z))), 0.0);
						vec3 horizonC = uHorizon + uSkyGlow * pow(gs, 6.0) * uSkyGlowI;
						col = mix(col, horizonC, smoothstep(18.0, 160.0, dist) * 0.95);
						gl_FragColor = vec4(col, 1.0);
					}`,
			}),
		[region],
	);
	useLayoutEffect(() => {
		const u = mat.uniforms;
		u.uProg.value.set(...prog);
		u.uCool.value.set(...cool);
		u.uTime.value = time;
		u.uSunDir.value.set(...look.sunDir).normalize();
		u.uSunCol.value.set(look.sunCol);
		u.uSunI.value = look.sunI;
		u.uSkyCol.value.set(look.skyCol);
		u.uFogCol.value.set(look.fogCol);
		u.uFogDens.value = look.fogDens;
		u.uFogMax.value = look.fogMax;
		u.uNight.value = look.night;
		u.uWater.value.set(look.waterCol);
		u.uDeep.value.set(look.waterDeep);
		u.uGlow.value = glow;
		u.uHorizon.value.set(horizon);
		if (sky) {
			u.uSkyGlow.value.set(sky.glow);
			u.uSkySun.value.set(...sky.sunDir);
			u.uSkyGlowI.value = sky.glowI;
		}
	});
	return (
		<mesh material={mat} rotation-x={-Math.PI / 2} position={[camera.position.x, 0, camera.position.z]} frustumCulled={false} renderOrder={-10}>
			<planeGeometry args={[1400, 1400, 1, 1]} />
		</mesh>
	);
};
