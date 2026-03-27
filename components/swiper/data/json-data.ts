import type { CompositionSlideData, SwiperData } from '@galacean/effects-components';
import type { AnimationClip } from '../animate/animation-clip';
import type { spec as SPEC } from '@galacean/effects';

export const geJSONData: {
  configs: Record<string, SwiperData>,
  animations: Record<string, any>,
  slideDataMap: Record<string, CompositionSlideData>,
  animationClips: Record<string, AnimationClip>,
  cameras: Record<string, SPEC.CameraOptions>,
} = {
  configs: {},
  animations: {},
  slideDataMap: {},
  animationClips: {},
  cameras: {},
};
