import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(94);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(16);
Config.setChromiumOpenGlRenderer('angle');
// no webpack cache for `npx remotion render | still | bundle`: it would land in the SHARED overlay node_modules/.cache
// (tools/render.mjs and tools/stills.mjs: off unless BUNDLE_CACHE=1). `npx remotion studio` has no switch and still writes
// node_modules/.cache/webpack/remotion-development-<version>. With caching off the CLI also DELETES a
// node_modules/.cache/webpack/remotion-production-<version> it finds (Remotion: «Cache disabled but found»), e.g. one left by
// BUNDLE_CACHE=1.
Config.setCachingEnabled(false);
