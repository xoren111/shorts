import {useThree} from '@react-three/fiber';
import {Bloom, EffectComposer, ToneMapping, Vignette} from '@react-three/postprocessing';
import {ShaderPass, ToneMappingMode} from 'postprocessing';
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import type {Cam} from './cam';
import {RCanvas} from './RCanvas';

export const W = 1080;
export const H = 1920;

const GlSetup: React.FC<{exposure: number}> = ({exposure}) => {
	const gl = useThree((s) => s.gl);
	useLayoutEffect(() => {
		gl.toneMapping = THREE.NoToneMapping; // tone mapping happens in the post chain
		gl.toneMappingExposure = exposure;
		gl.outputColorSpace = THREE.SRGBColorSpace;
	}, [gl, exposure]);
	return null;
};

/** Sets the R3F default camera from pure Cam data every frame (before R3F renders the frame). */
const CamRig: React.FC<{cam: Cam; near: number; far: number}> = ({cam, near, far}) => {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	useLayoutEffect(() => {
		camera.position.set(...cam.pos);
		camera.up.set(0, 1, 0);
		camera.lookAt(...cam.target);
		if (cam.roll) camera.rotateZ((cam.roll * Math.PI) / 180);
		camera.fov = cam.fov;
		camera.aspect = W / H;
		camera.near = near;
		camera.far = far;
		camera.updateProjectionMatrix();
	});
	return null;
};

// NaN/Inf guard first in the post chain (one bad pixel would be spread over the whole frame by bloom) + HDR clamp
const makeNanGuard = () =>
	new ShaderPass(
		new THREE.ShaderMaterial({
			uniforms: {inputBuffer: {value: null}},
			vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
			fragmentShader: `uniform sampler2D inputBuffer; varying vec2 vUv;
				void main(){
					vec4 c = texture2D(inputBuffer, vUv);
					float s = c.r + c.g + c.b + c.a;
					bool bad = any(isnan(c)) || any(isinf(c)) || !(s > -1.0 && s < 1.0e5);
					gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : clamp(c, vec4(0.0), vec4(64.0));
				}`,
			depthWrite: false,
			depthTest: false,
		}),
		'inputBuffer',
	);

export type PostOpts = {bloom?: number; threshold?: number; radius?: number; vignette?: number};

const Post: React.FC<PostOpts> = ({bloom = 1.1, threshold = 0.85, radius = 0.8, vignette = 0.45}) => {
	const nan = useMemo(makeNanGuard, []);
	return (
		<EffectComposer multisampling={4} frameBufferType={THREE.HalfFloatType} enableNormalPass={false}>
			<primitive object={nan} />
			<Bloom mipmapBlur intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.3} radius={radius} />
			<ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
			<Vignette offset={0.3} darkness={vignette} eskil={false} />
		</EffectComposer>
	);
};

export const Stage3D: React.FC<{cam: Cam; children: React.ReactNode; post?: PostOpts; exposure?: number; near?: number; far?: number; style?: React.CSSProperties}> = ({
	cam,
	children,
	post = {},
	exposure = 1,
	near = 0.02,
	far = 600,
	style,
}) => (
	<RCanvas width={W} height={H} style={style} gl={{antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true}} dpr={1} camera={{fov: cam.fov, position: cam.pos, near, far}}>
		<GlSetup exposure={exposure} />
		<CamRig cam={cam} near={near} far={far} />
		{children}
		<Post {...post} />
	</RCanvas>
);
