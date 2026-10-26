import React, {useMemo} from 'react';
import * as THREE from 'three';
import {NOISE} from './glsl';

export type V3 = [number, number, number];

/** simple lit material for props (no three.js lights in these scenes): sun + ambient + rim */
export const propMat = (color: string, o: {sun?: V3; sunCol?: string; amb?: number; rim?: string; rimI?: number; emissive?: string; emI?: number} = {}) =>
	new THREE.ShaderMaterial({
		uniforms: {
			uCol: {value: new THREE.Color(color)},
			uSun: {value: new THREE.Vector3(...(o.sun ?? [-0.6, 0.5, 0.3])).normalize()},
			uSunCol: {value: new THREE.Color(o.sunCol ?? '#ffb27a')},
			uAmb: {value: o.amb ?? 0.35},
			uRim: {value: new THREE.Color(o.rim ?? '#ff9a5a')},
			uRimI: {value: o.rimI ?? 1.2},
			uEm: {value: new THREE.Color(o.emissive ?? '#000000')},
			uEmI: {value: o.emI ?? 0},
		},
		vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uAmb; uniform vec3 uRim; uniform float uRimI; uniform vec3 uEm; uniform float uEmI;
			varying vec3 vN; varying vec3 vW;
			void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
				float d = max(dot(N, uSun), 0.0); float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
				vec3 c = uCol * (uAmb + uSunCol * d * 1.4) + uRim * rim * uRimI + uEm * uEmI;
				gl_FragColor = vec4(c, 1.0); }`,
	});

/** 1930s US Army Air Corps biplane bomber (olive-drab fuselage, chrome-yellow wings), simple 3D model (nose = +x), unit ≈ fuselage length */
export const Biplane: React.FC<{pos: V3; yaw: number; roll?: number; pitch?: number; scale: number; t: number; mat: THREE.Material; wing?: THREE.Material}> = ({pos, yaw, roll = 0, pitch = 0, scale, t, mat, wing}) => {
	const prop = useMemo(() => new THREE.MeshBasicMaterial({color: '#d8c8b8', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false}), []);
	const w = wing ?? mat;
	return (
		<group position={pos} rotation={[0, yaw, 0]}>
			<group rotation={[roll, 0, pitch]} scale={scale}>
				{/* tapered round fuselage */}
				<mesh material={mat} position={[0.02, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
					<cylinderGeometry args={[0.035, 0.075, 1.0, 14]} />
				</mesh>
				<mesh material={mat} position={[0.52, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
					<cylinderGeometry args={[0.09, 0.078, 0.1, 18]} />
				</mesh>
				<mesh material={mat} position={[0.2, 0.085, 0]}>
					<boxGeometry args={[0.16, 0.05, 0.1]} />
				</mesh>
				{/* wings with a little thickness, slight dihedral */}
				<mesh material={w} position={[0.13, 0.25, 0]}>
					<boxGeometry args={[0.24, 0.022, 1.6]} />
				</mesh>
				<mesh material={w} position={[0.1, -0.075, 0.33]} rotation={[0.04, 0, 0]}>
					<boxGeometry args={[0.21, 0.02, 0.66]} />
				</mesh>
				<mesh material={w} position={[0.1, -0.075, -0.33]} rotation={[-0.04, 0, 0]}>
					<boxGeometry args={[0.21, 0.02, 0.66]} />
				</mesh>
				{[-0.6, -0.27, 0.27, 0.6].map((z) => (
					<mesh key={z} material={mat} position={[0.12, 0.09, z]}>
						<boxGeometry args={[0.018, 0.32, 0.012]} />
					</mesh>
				))}
				{/* engine nacelles between the wings */}
				{[-0.3, 0.3].map((z) => (
					<mesh key={'n' + z} material={mat} position={[0.25, 0.08, z]} rotation={[0, 0, -Math.PI / 2]}>
						<cylinderGeometry args={[0.045, 0.05, 0.22, 12]} />
					</mesh>
				))}
				<mesh material={w} position={[-0.46, 0.03, 0]}>
					<boxGeometry args={[0.16, 0.016, 0.5]} />
				</mesh>
				<mesh material={mat} position={[-0.47, 0.12, 0]}>
					<boxGeometry args={[0.17, 0.2, 0.015]} />
				</mesh>
				{[-0.14, 0.14].map((z) => (
					<mesh key={z} material={mat} position={[0.22, -0.2, z]} rotation={[Math.PI / 2, 0, 0]}>
						<cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
					</mesh>
				))}
				{[-0.3, 0.3].map((z) => (
					<mesh key={'p' + z} material={prop} position={[0.37, 0.08, z]} rotation={[0, Math.PI / 2, t * 40 + z]}>
						<circleGeometry args={[0.13, 24]} />
					</mesh>
				))}
			</group>
		</group>
	);
};

/** falling bomb oriented along its velocity */
export const Bomb: React.FC<{pos: V3; vel: V3; scale: number; mat: THREE.Material}> = ({pos, vel, scale, mat}) => {
	const q = useMemo(() => new THREE.Quaternion(), []);
	const v = new THREE.Vector3(...vel).normalize();
	q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.lengthSq() > 0 ? v : new THREE.Vector3(0, -1, 0));
	return (
		<group position={pos} quaternion={q} scale={scale}>
			<mesh material={mat}>
				<capsuleGeometry args={[0.06, 0.22, 4, 10]} />
			</mesh>
			<mesh material={mat} position={[0, 0.19, 0]}>
				<boxGeometry args={[0.16, 0.06, 0.02]} />
			</mesh>
			<mesh material={mat} position={[0, 0.19, 0]}>
				<boxGeometry args={[0.02, 0.06, 0.16]} />
			</mesh>
		</group>
	);
};

/** small fishing boat (bow = +x) */
export const Boat: React.FC<{pos: V3; yaw: number; scale: number; mat: THREE.Material; cabin: THREE.Material}> = ({pos, yaw, scale, mat, cabin}) => (
	<group position={pos} rotation={[0, yaw, 0]} scale={scale}>
		<mesh material={mat} position={[0, 0.05, 0]}>
			<boxGeometry args={[1.0, 0.16, 0.3]} />
		</mesh>
		<mesh material={mat} position={[0.55, 0.06, 0]} rotation={[0, Math.PI / 4, 0]}>
			<boxGeometry args={[0.21, 0.16, 0.21]} />
		</mesh>
		<mesh material={cabin} position={[-0.15, 0.22, 0]}>
			<boxGeometry args={[0.3, 0.2, 0.22]} />
		</mesh>
		<mesh material={mat} position={[0.15, 0.42, 0]}>
			<boxGeometry args={[0.02, 0.6, 0.02]} />
		</mesh>
	</group>
);

/** expanding shockwave ring lying on the ground */
export const Shockwave: React.FC<{pos: V3; t: number; radius: number; color?: string}> = ({pos, t, radius, color = '#ffd28a'}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uA: {value: 0}, uC: {value: new THREE.Color(color)}},
				vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform float uA; uniform vec3 uC; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float ring = exp(-pow((r - 0.86) / 0.045, 2.0)) + 0.05 * exp(-pow((r - 0.7) / 0.15, 2.0)); gl_FragColor = vec4(uC * ring * uA * 2.2, 1.0); }`,
				transparent: true,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
				side: THREE.DoubleSide,
			}),
		[color],
	);
	if (t < 0 || t > 1.0) return null;
	const k = 1 - Math.exp(-t * 4.5);
	mat.uniforms.uA.value = Math.max(0, 1 - t / 1.0) ** 2;
	return (
		<mesh material={mat} position={[pos[0], pos[1] + 0.003, pos[2]]} rotation-x={-Math.PI / 2} scale={radius * k * 2 + 0.001} renderOrder={6}>
			<planeGeometry args={[1, 1]} />
		</mesh>
	);
};

/** earth barrier between two ground points; `rise` 0..1 grows it out of the ground; `over` 0..1 = lava pouring over the crest */
export const DirtWall: React.FC<{a: V3; b: V3; height: number; thick: number; rise: number; over: number; t: number}> = ({a, b, height, thick, rise, over, t}) => {
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uOver: {value: 0}, uT: {value: 0}},
				vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
				fragmentShader: `uniform float uOver; uniform float uT; varying vec3 vP; varying vec3 vN; ${NOISE}
					vec3 ramp(float h){ vec3 c1 = vec3(0.55,0.015,0.16); vec3 c2 = vec3(2.6,0.32,0.035); vec3 c3 = vec3(5.5,2.4,0.45); return h < 0.5 ? mix(c1, c2, h * 2.0) : mix(c2, c3, (h - 0.5) * 2.0); }
					void main(){ float n = fbm(vP.xy * 9.0 + vP.z * 3.0);
						// dark volcanic earth with bulldozer tracks along the bank and a darker foot (contact shadow)
						float tracks = 0.92 + 0.16 * (fbm(vP.xz * vec2(30.0, 6.0)) - 0.5);
						float foot = smoothstep(-0.5, -0.15, vP.y);
						vec3 dirt = mix(vec3(0.11, 0.09, 0.07), vec3(0.24, 0.19, 0.14), n) * tracks * (0.5 + 0.6 * max(vN.y, 0.0) + 0.25 * vN.x) * (0.55 + 0.45 * foot);
						dirt += vec3(0.35, 0.24, 0.16) * smoothstep(0.42, 0.5, vP.y) * 0.6; // sunlit crest
						// lava overflow: covers the crest and runs down the downstream face (+x side) from the top
						float y01 = vP.y + 0.5;
						float cover = smoothstep(1.0 - uOver * 1.4, 1.02 - uOver * 1.4, y01 + (n - 0.5) * 0.25) * step(-0.2, vN.x + vN.y);
						float heat = 0.55 + 0.45 * fbm(vP.xy * 14.0 - vec2(0.0, uT * 1.5));
						vec3 c = mix(dirt, ramp(heat) * 0.6, cover * step(0.001, uOver));
						gl_FragColor = vec4(c, 1.0); }`,
			}),
		[],
	);
	mat.uniforms.uOver.value = over;
	mat.uniforms.uT.value = t;
	const dx = b[0] - a[0];
	const dz = b[2] - a[2];
	const len = Math.hypot(dx, dz);
	const yaw = -Math.atan2(dz, dx);
	const h = Math.max(1e-4, height * rise);
	const yBase = Math.min(a[1], b[1]);
	return (
		<mesh material={mat} geometry={trapezoid} position={[(a[0] + b[0]) / 2, yBase - height * 0.3, (a[2] + b[2]) / 2]} rotation={[0, yaw, 0]} scale={[thick, h + height * 0.3, len]} renderOrder={2} />
	);
};

/** earth embankment cross-section (unit): 1 wide at the base, 0.34 at the crest, height 1, extruded 1 along z (centred) */
const trapezoid = (() => {
	const sh = new THREE.Shape();
	sh.moveTo(-0.5, 0);
	sh.lineTo(0.5, 0);
	sh.lineTo(0.17, 1);
	sh.lineTo(-0.17, 1);
	sh.closePath();
	const g = new THREE.ExtrudeGeometry(sh, {depth: 1, bevelEnabled: false, steps: 6});
	g.translate(0, -0.5, -0.5);
	g.computeVertexNormals();
	return g;
})();

/** glowing lava tube seen "x-ray" through the ground (drawn on top) */
export const XrayTube: React.FC<{pts: V3[]; radius: number; alpha: number; t: number; color?: string}> = ({pts, radius, alpha, t, color = '#ff6a1a'}) => {
	const geom = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 120, radius, 12, false), [pts, radius]);
	const mat = useMemo(
		() =>
			new THREE.ShaderMaterial({
				uniforms: {uA: {value: 0}, uT: {value: 0}, uC: {value: new THREE.Color(color)}},
				vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
				fragmentShader: `uniform float uA; uniform float uT; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
					void main(){ float rim = pow(1.0 - abs(dot(vN, vV)), 1.5); float pulse = 0.6 + 0.4 * sin(vUv.x * 60.0 - uT * 10.0);
						gl_FragColor = vec4(uC * (0.5 + 2.5 * rim) * pulse * uA * 2.0, 1.0); }`,
				transparent: true,
				depthWrite: false,
				depthTest: false,
				blending: THREE.AdditiveBlending,
			}),
		[color],
	);
	mat.uniforms.uA.value = alpha;
	mat.uniforms.uT.value = t;
	if (alpha <= 0.001) return null;
	return <mesh geometry={geom} material={mat} renderOrder={20} />;
};
