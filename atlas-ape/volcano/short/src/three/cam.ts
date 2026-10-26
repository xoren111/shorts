import * as THREE from 'three';
import {lerp} from '../lib/ease';

export type V3 = [number, number, number];
/** Camera state for one frame: position, look-at target, vertical fov (deg). Pure data → used by the 3D scene AND 2D overlays. */
export type Cam = {pos: V3; target: V3; fov: number; roll?: number};

/** Orbit description: around `target`, azimuth (deg, 0 = +z front, 90 = +x right), elevation (deg), distance. */
export type Orbit = {target: V3; az: number; el: number; dist: number; fov: number; roll?: number};

export const orbit = (o: Orbit): Cam => {
	const az = (o.az * Math.PI) / 180;
	const el = (o.el * Math.PI) / 180;
	return {
		pos: [o.target[0] + o.dist * Math.cos(el) * Math.sin(az), o.target[1] + o.dist * Math.sin(el), o.target[2] + o.dist * Math.cos(el) * Math.cos(az)],
		target: o.target,
		fov: o.fov,
		roll: o.roll,
	};
};

export const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const lerpOrbit = (a: Orbit, b: Orbit, t: number): Orbit => ({
	target: lerpV(a.target, b.target, t),
	az: lerp(a.az, b.az, t),
	el: lerp(a.el, b.el, t),
	dist: lerp(a.dist, b.dist, t),
	fov: lerp(a.fov, b.fov, t),
	roll: lerp(a.roll ?? 0, b.roll ?? 0, t),
});

/** Piecewise orbit path: keys at frames, eased with smootherstep between keys. */
export const orbitPath = (keys: {f: number; o: Orbit}[], frame: number): Cam => {
	if (frame <= keys[0].f) return orbit(keys[0].o);
	for (let k = 0; k < keys.length - 1; k++) {
		const a = keys[k];
		const b = keys[k + 1];
		if (frame <= b.f) {
			const x = (frame - a.f) / Math.max(1, b.f - a.f);
			const t = x * x * x * (x * (x * 6 - 15) + 10);
			return orbit(lerpOrbit(a.o, b.o, t));
		}
	}
	return orbit(keys[keys.length - 1].o);
};

const tmpCam = new THREE.PerspectiveCamera();
/** Project a world point to screen pixels for this camera (same math as the renderer). */
export const project = (cam: Cam, p: V3, w = 1920, h = 1080) => {
	tmpCam.fov = cam.fov;
	tmpCam.aspect = w / h;
	tmpCam.near = 0.05;
	tmpCam.far = 500;
	tmpCam.position.set(...cam.pos);
	tmpCam.up.set(0, 1, 0);
	tmpCam.lookAt(new THREE.Vector3(...cam.target));
	if (cam.roll) tmpCam.rotateZ((cam.roll * Math.PI) / 180);
	tmpCam.updateProjectionMatrix();
	tmpCam.updateMatrixWorld(true);
	const v = new THREE.Vector3(...p).project(tmpCam);
	return {x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, behind: v.z > 1};
};
