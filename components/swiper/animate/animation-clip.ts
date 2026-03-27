import type {
  ValueGetter,
  BezierCurve,
  ColorCurve,
  VFXItem as PlayerVFXItem,
  spec as SPEC,
  Vector3Curve, SpriteComponent } from '@galacean/effects';
import { CompositionComponent } from '@galacean/effects';
import { createValueGetter } from '@galacean/effects';
import { clamp } from '../common/utils';

export interface AnimationCurve {
  path: string,
  keyFrames: ValueGetter<any>,
}

export interface PositionAnimationCurve extends AnimationCurve {
  keyFrames: Vector3Curve,
}

export interface EulerAnimationCurve extends AnimationCurve {
  // @ts-expect-error
  keyFrames: ValueGetter<Euler>,
}

export interface RotationAnimationCurve extends AnimationCurve {
  // @ts-expect-error
  keyFrames: ValueGetter<Quaternion>,
}

export interface ScaleAnimationCurve extends AnimationCurve {
  keyFrames: Vector3Curve,
}

export interface FloatAnimationCurve extends AnimationCurve {
  property: string,
  className: string,
  keyFrames: BezierCurve,
}

export interface ColorAnimationCurve extends AnimationCurve {
  property: string,
  className: string,
  keyFrames: ColorCurve,
}

export class AnimationClip {
  duration = 0;
  positionCurves: PositionAnimationCurve[] = [];
  rotationCurves: RotationAnimationCurve[] = [];
  eulerCurves: EulerAnimationCurve[] = [];
  scaleCurves: ScaleAnimationCurve[] = [];
  floatCurves: FloatAnimationCurve[] = [];
  colorCurves: ColorAnimationCurve[] = [];

  sampleElement (element: HTMLElement, time: number, widthRatio: number) {
    const life = clamp(time, 0, this.duration);
    let transform = '';

    for (const curve of this.positionCurves) {
      const value = curve.keyFrames.getValue(life);

      transform += `translate3d(${value.x * widthRatio}px, ${value.y * widthRatio}px, ${value.z * widthRatio}px)`;
    }

    for (const curve of this.eulerCurves) {
      const value = curve.keyFrames.getValue(life);

      transform += ` rotateX(${value.x}deg) rotateY(${value.y}deg) rotateZ(${value.z}deg)`;
    }

    for (const curve of this.scaleCurves) {
      const value = curve.keyFrames.getValue(life);

      transform += ` scale(${value.x}, ${value.y})`;
    }

    for (const curve of this.colorCurves) {
      const value = curve.keyFrames.getValue(life);

      element.style.opacity = String(value.a);
    }

    if (transform) {
      element.style.transform = transform;
    }

  }

  sampleAnimation (vfxItem: PlayerVFXItem, time: number, onCustomValueChange?: (key: string, value: number) => void) {
    const life = clamp(time, 0, this.duration);

    for (const curve of this.positionCurves) {
      const value = curve.keyFrames.getValue(life);
      const target = findTarget(vfxItem, curve.path);

      target?.transform.setPosition(value.x, value.y, value.z);
    }

    for (const curve of this.rotationCurves) {
      const value = curve.keyFrames.getValue(life);
      const target = findTarget(vfxItem, curve.path);

      target?.transform.setQuaternion(value.x, value.y, value.z, value.w);
    }

    for (const curve of this.eulerCurves) {
      const value = curve.keyFrames.getValue(life);
      const target = findTarget(vfxItem, curve.path);

      target?.transform.setRotation(value.x, value.y, value.z);
    }

    for (const curve of this.scaleCurves) {
      const value = curve.keyFrames.getValue(life);
      const target = findTarget(vfxItem, curve.path);

      target?.transform.setScale(value.x, value.y, value.z);
    }

    for (const curve of this.colorCurves) {
      const target = findTarget(vfxItem, curve.path);

      if (target) {
        const value = curve.keyFrames.getValue(life);

        target.components.forEach(component => {
          if ('setColor' in component) {
            (component as SpriteComponent).setColor(value);
          }
        });
      }
    }

    for (const curve of this.floatCurves) {
      const target = findTarget(vfxItem, curve.path);

      if (target) {
        const value = curve.keyFrames.getValue(life);

        if (curve.property === 'isActive') {
          // @ts-expect-error
          target[curve.property] = value;
        }
      }
    }

  }

  getAnimationSampleValues (time: number) {
    const life = clamp(time, 0, this.duration);

    type SampleValue = {
      position?: [number, number, number],
      rotation?: [number, number, number],
      quaternion?: [number, number, number, number],
      scale?: [number, number, number],
      color?: [number, number, number, number],
      float?: Record<string, number>,
    };

    const sampleValues: Record<string, SampleValue> = {};

    for (const curve of this.positionCurves) {
      const value = curve.keyFrames.getValue(life);

      sampleValues[curve.path] ??= {};
      sampleValues[curve.path].position = [value.x, value.y, value.z];
    }

    for (const curve of this.rotationCurves) {
      const value = curve.keyFrames.getValue(life);

      sampleValues[curve.path] ??= {};
      sampleValues[curve.path].quaternion = [value.x, value.y, value.z, value.w];
    }

    for (const curve of this.eulerCurves) {
      const value = curve.keyFrames.getValue(life);

      sampleValues[curve.path] ??= {};
      sampleValues[curve.path].rotation = [value.x, value.y, value.z];
    }

    for (const curve of this.scaleCurves) {
      const value = curve.keyFrames.getValue(life);

      sampleValues[curve.path] ??= {};
      sampleValues[curve.path].scale = [value.x, value.y, value.z];
    }

    for (const curve of this.colorCurves) {
      const value = curve.keyFrames.getValue(life);

      sampleValues[curve.path] ??= {};
      sampleValues[curve.path].color = [value.r, value.g, value.b, value.a];
    }

    for (const curve of this.floatCurves) {
      const value = curve.keyFrames.getValue(life);

      sampleValues[curve.path] ??= {};
      sampleValues[curve.path].float ??= {};
      sampleValues[curve.path].float![curve.property] = value;
    }

    return sampleValues;
  }

  fromData (data: SPEC.AnimationClipData): void {
    this.positionCurves.length = 0;
    this.scaleCurves.length = 0;
    this.rotationCurves.length = 0;
    this.eulerCurves.length = 0;
    this.floatCurves.length = 0;
    this.colorCurves.length = 0;

    let keyFramesDuration = 0;

    if (data.positionCurves) {
      for (const positionCurveData of data.positionCurves) {
        const curve: PositionAnimationCurve = {
          path: positionCurveData.path,
          keyFrames: createValueGetter(positionCurveData.keyFrames) as Vector3Curve,
        };

        keyFramesDuration = Math.max(keyFramesDuration, curve.keyFrames.getMaxTime());

        this.positionCurves.push(curve);
      }
    }

    if (data.rotationCurves) {
      for (const rotationCurveData of data.rotationCurves) {
        const curve: RotationAnimationCurve = {
          path: rotationCurveData.path,
          keyFrames: createValueGetter(rotationCurveData.keyFrames),
        };

        keyFramesDuration = Math.max(keyFramesDuration, curve.keyFrames.getMaxTime());

        this.rotationCurves.push(curve);
      }
    }

    if (data.eulerCurves) {
      for (const eulerCurvesData of data.eulerCurves) {
        const curve: EulerAnimationCurve = {
          path: eulerCurvesData.path,
          keyFrames: createValueGetter(eulerCurvesData.keyFrames),
        };

        keyFramesDuration = Math.max(keyFramesDuration, curve.keyFrames.getMaxTime());

        this.eulerCurves.push(curve);
      }
    }

    if (data.scaleCurves) {
      for (const scaleCurvesData of data.scaleCurves) {
        const curve: ScaleAnimationCurve = {
          path: scaleCurvesData.path,
          keyFrames: createValueGetter(scaleCurvesData.keyFrames) as Vector3Curve,
        };

        keyFramesDuration = Math.max(keyFramesDuration, curve.keyFrames.getMaxTime());

        this.scaleCurves.push(curve);
      }
    }

    if (data.floatCurves) {
      for (const floatCurveData of data.floatCurves) {
        const curve: FloatAnimationCurve = {
          path: floatCurveData.path,
          keyFrames: createValueGetter(floatCurveData.keyFrames) as BezierCurve,
          property: floatCurveData.property,
          className: floatCurveData.className,
        };

        keyFramesDuration = Math.max(keyFramesDuration, curve.keyFrames.getMaxTime());

        this.floatCurves.push(curve);
      }
    }

    if (data.colorCurves) {
      for (const colorCurveData of data.colorCurves) {
        const curve: ColorAnimationCurve = {
          path: colorCurveData.path,
          keyFrames: createValueGetter(colorCurveData.keyFrames) as ColorCurve,
          property: colorCurveData.property,
          className: colorCurveData.className,
        };

        keyFramesDuration = Math.max(keyFramesDuration, curve.keyFrames.getMaxTime());

        this.colorCurves.push(curve);
      }
    }

    if (data.duration !== undefined) {
      this.duration = data.duration;
    } else {
      this.duration = keyFramesDuration;
    }
  }
}

export function findTarget (vfxItem: PlayerVFXItem, path: string): PlayerVFXItem | undefined {
  let target: PlayerVFXItem = vfxItem;
  const paths = path.split('/');

  for (let i = 0; i < paths.length; i++) {
    const name = paths[i];
    let findTag = false;

    for (const child of target.children) {
      if (child.getComponent(CompositionComponent)) {
        const ret = findTarget(child, path);

        if (ret) {
          return ret;
        }
      } else if (child.name === name) {
        target = child;
        findTag = true;

        break;
      }
    }
    if (!findTag) {
      return;
    }
  }

  return target;
}
