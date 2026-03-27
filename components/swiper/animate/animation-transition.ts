import type { AnimationClip } from './animation-clip';
import { findTarget } from './animation-clip';
import type { SpriteComponent, VFXItem as PlayerVFXItem } from '@galacean/effects';

export function animationTransition ({
  progress,
  animationClipA,
  animationClipB,
  aTime,
  bTime,
  vfxItem,
}: {
  progress: number,
  animationClipA: AnimationClip,
  aTime: number,
  animationClipB: AnimationClip,
  bTime: number,
  vfxItem: PlayerVFXItem,
}) {
  const fromSample = animationClipA.getAnimationSampleValues(aTime);
  const toSample = animationClipB.getAnimationSampleValues(bTime);

  for (const path in fromSample) {
    if (!toSample[path]) {
      continue;
    }
    const target = findTarget(vfxItem, path);

    if (!target) {
      continue;
    }
    const { position, rotation, scale, color, float } = fromSample[path];
    const toValue = toSample[path];

    if (position && toValue.position) {
      const v = interpolateArray(position, toValue.position, progress);

      target.transform.setPosition(v[0], v[1], v[2]);
    }
    if (rotation && toValue.rotation) {
      const v = interpolateArray(rotation, toValue.rotation, progress);

      target.transform.setRotation(v[0], v[1], v[2]);
    }
    if (scale && toValue.scale) {
      const v = interpolateArray(scale, toValue.scale, progress);

      target.transform.setScale(v[0], v[1], v[2]);
    }
    if (color && toValue.color) {
      const v = interpolateArray(color, toValue.color, progress);

      target.components.forEach(component => {
        if ('setColor' in component) {
          (component as SpriteComponent).setColor(v as [number, number, number, number]);
        }
      });
    }
    if (float && toValue.float) {
      for (const [key, value] of Object.entries(float)) {
        if (toValue.float[key]) {
          let v = 0;

          if (key === 'isActive') {
            v = value === toValue.float[key] ? value : (value === 0 ? 1 : 0);
          } else {
            v = interpolate(value, toValue.float[key], progress);
          }
          // @ts-expect-error
          target[key] = v;
        }
      }
    }
  }

}

function interpolate (a: number, b: number, progress: number) {
  return a * (1 - progress) + b * progress;
}

function interpolateArray (a: number[], b: number[], progress: number) {
  return a.map((v, i) => interpolate(v, b[i], progress));
}
