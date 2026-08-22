/**
 * Remotion's composition registry.
 *
 * Two compositions, one component: the film exists in French and English, cut
 * to identical frames, so the only thing that differs between them is which
 * copy object is passed in. Registering both means `npx remotion render` can
 * produce either, and the studio can be used to review either.
 */

import { Composition } from "remotion";

import { BlinkAd, type AdProps } from "./BlinkAd";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { DURATION } from "./timeline";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="BlinkAd-fr"
        component={BlinkAd as React.FC<AdProps>}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ lang: "fr", silent: false } satisfies AdProps}
      />
      <Composition
        id="BlinkAd-en"
        component={BlinkAd as React.FC<AdProps>}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ lang: "en", silent: false } satisfies AdProps}
      />
    </>
  );
}
