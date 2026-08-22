/**
 * Remotion's CLI config.
 *
 * The webpack override lives in `scripts/webpack-override.mjs` because the
 * programmatic bundler used by the render scripts cannot read this file, and
 * the studio and the renderer compiling the film differently is the kind of
 * bug that only ever shows up as "but it looked right in the studio".
 */

import { Config } from "@remotion/cli/config";

import { webpackOverride } from "./scripts/webpack-override.mjs";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// The film is flat colour and type. CRF 18 is visually lossless on this kind
// of material and roughly halves the file against the default.
Config.setCrf(18);

Config.overrideWebpackConfig(webpackOverride);
