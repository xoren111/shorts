import type {SkyLook} from './Sky';
import type {Look} from './TerrainMesh';

// Colour scripts per region: glowing lava (orange / gold / magenta) against teal / indigo / violet skies.
export const LOOKS: Record<string, {terrain: Look; sky: SkyLook}> = {
	// Hawaii: sunset behind Mauna Loa (sun in the west) — backlit slopes, cool teal shadows, magenta horizon
	hawaii: {
		terrain: {
			sunDir: [-0.8, 0.22, 0.25], sunCol: '#ffb070', sunI: 3.4, skyCol: '#3f7fc8', groundCol: '#2a1838', ambI: 1.15,
			fogCol: '#8a5ab8', fogDens: 0.0045, fogMax: 0.5, satGain: 1.35, saturation: 1.2, contrast: 1.05, night: 0,
			waterCol: '#0b5a6e', waterDeep: '#081a40', tint: '#ffffff', expo: 1.0,
		},
		sky: {top: '#0d0a3a', mid: '#3a1f86', horizon: '#ff4f7b', glow: '#ffae3d', sunDir: [-0.8, 0.05, 0.25], stars: 0.15, glowI: 1.8},
	},
	// Etna: golden morning light from the east into Valle del Bove, violet sky behind the summit
	etna: {
		terrain: {
			sunDir: [0.75, 0.38, 0.35], sunCol: '#ffc285', sunI: 3.0, skyCol: '#4a86c8', groundCol: '#2a1a30', ambI: 1.1,
			fogCol: '#8f6ac0', fogDens: 0.006, fogMax: 0.5, satGain: 1.3, saturation: 1.2, contrast: 1.05, night: 0,
			waterCol: '#0d6a7a', waterDeep: '#0a2048', tint: '#ffffff', expo: 1.0,
		},
		sky: {top: '#120c45', mid: '#4b2a95', horizon: '#ff7a8a', glow: '#ffc060', sunDir: [0.75, 0.05, 0.35], stars: 0, glowI: 1.2},
	},
	// Heimaey, 23 Jan 1973, ~2 a.m.: winter night, the fissure lights everything
	iceNight: {
		terrain: {
			sunDir: [0.3, 0.5, -0.6], sunCol: '#8fb6ff', sunI: 0.9, skyCol: '#2a4a9a', groundCol: '#0a0c1c', ambI: 1.2,
			fogCol: '#1c2a66', fogDens: 0.02, fogMax: 0.6, satGain: 1.2, saturation: 0.9, contrast: 1.0, night: 0.55,
			waterCol: '#0c4a6a', waterDeep: '#06183a', tint: '#cfe0ff', expo: 1.0,
		},
		sky: {top: '#01030d', mid: '#07123a', horizon: '#26306e', glow: '#ff5a1a', sunDir: [0.4, 0.0, -0.9], stars: 1, glowI: 0.6},
	},
	// Heimaey later (pumping, the new rock): pink-gold dawn
	iceDawn: {
		terrain: {
			sunDir: [0.85, 0.2, 0.1], sunCol: '#ffb38a', sunI: 3.0, skyCol: '#5a8ad0', groundCol: '#24182e', ambI: 1.15,
			fogCol: '#a07ac0', fogDens: 0.012, fogMax: 0.45, satGain: 1.3, saturation: 1.15, contrast: 1.05, night: 0,
			waterCol: '#0b6170', waterDeep: '#0a2450', tint: '#ffffff', expo: 1.0,
		},
		sky: {top: '#151050', mid: '#5a3aa8', horizon: '#ff9a8a', glow: '#ffd27a', sunDir: [0.85, 0.05, 0.1], stars: 0, glowI: 1.4},
	},
};
