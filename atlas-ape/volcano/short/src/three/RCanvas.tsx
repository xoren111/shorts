import {Canvas, useThree, type CanvasProps, type RootState} from '@react-three/fiber';
import React, {Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Internals, useCurrentFrame, useDelayRender, useRemotionEnvironment} from 'remotion';

// Own variant of @remotion/three's ThreeCanvas: identical contract, but the per-frame advance() runs AFTER all children's
// effects (EffectComposer adds its passes in a passive effect — with the stock renderer the first frame of every canvas
// mount and every still came out blank).

const Unblocker: React.FC = () => {
	const {delayRender, continueRender} = useDelayRender();
	useLayoutEffect(() => {
		const h = delayRender('Waiting for <Suspense/> in RCanvas');
		return () => continueRender(h);
	}, [delayRender, continueRender]);
	return null;
};

const Scale: React.FC<{width: number; height: number}> = ({width, height}) => {
	const {set, setSize: threeSetSize} = useThree();
	const [setSize] = useState(() => threeSetSize);
	useLayoutEffect(() => {
		setSize(width, height);
		set({setSize: () => null});
		return () => set({setSize});
	}, [setSize, width, height, set]);
	return null;
};

const FrameRenderer: React.FC<{onRendered: () => void}> = ({onRendered}) => {
	const advance = useThree((s) => s.advance);
	const frame = useCurrentFrame();
	const first = useRef(true);
	useEffect(() => {
		if (!first.current) {
			advance(performance.now());
			onRendered();
			return;
		}
		// First frame of this canvas: EffectComposer collects its effect passes through a follow-up render, so let React
		// settle (macrotask → animation frame → macrotask) and render twice before the frame is released.
		let cancelled = false;
		const go = () => {
			if (cancelled) return;
			advance(performance.now());
			advance(performance.now() + 1);
			first.current = false;
			onRendered();
		};
		const id = setTimeout(() => requestAnimationFrame(() => setTimeout(go, 0)), 0);
		return () => {
			cancelled = true;
			clearTimeout(id);
		};
	}, [frame, advance, onRendered]);
	return null;
};

export type RCanvasProps = Omit<CanvasProps, 'children'> & {width: number; height: number; children: React.ReactNode};

export const RCanvas: React.FC<RCanvasProps> = ({children, width, height, style, onCreated, ...rest}) => {
	const {isRendering} = useRemotionEnvironment();
	const {delayRender, continueRender} = useDelayRender();
	const contexts = Internals.useRemotionContexts();
	const frame = useCurrentFrame();
	const createdHold = useRef<number | null>(null);
	const created = useRef(false);
	useLayoutEffect(() => {
		if (created.current) return;
		createdHold.current = delayRender('Waiting for <RCanvas/> to be created');
		return () => {
			if (createdHold.current !== null) {
				continueRender(createdHold.current);
				createdHold.current = null;
			}
		};
	}, [delayRender, continueRender]);

	const frameHold = useRef<number | null>(null);
	useLayoutEffect(() => {
		if (!isRendering) return;
		frameHold.current = delayRender(`Waiting for R3F frame ${frame}`);
		return () => {
			if (frameHold.current !== null) {
				continueRender(frameHold.current);
				frameHold.current = null;
			}
		};
	}, [frame, isRendering, delayRender, continueRender]);

	const handleRendered = useCallback(() => {
		if (frameHold.current !== null) {
			continueRender(frameHold.current);
			frameHold.current = null;
		}
	}, [continueRender]);

	const handleCreated = useCallback(
		(state: RootState) => {
			created.current = true;
			if (createdHold.current !== null) {
				continueRender(createdHold.current);
				createdHold.current = null;
			}
			onCreated?.(state);
		},
		[continueRender, onCreated],
	);

	return (
		<Suspense fallback={<Unblocker />}>
			<Canvas style={{width, height, ...style}} {...rest} resize={{offsetSize: true}} frameloop={isRendering ? 'never' : 'always'} onCreated={handleCreated}>
				<Scale width={width} height={height} />
				<Internals.RemotionContextProvider contexts={contexts}>
					{children}
					{isRendering ? <FrameRenderer onRendered={handleRendered} /> : null}
				</Internals.RemotionContextProvider>
			</Canvas>
		</Suspense>
	);
};
