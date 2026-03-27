import type { Camera as PlayerCamera, VFXItem as PlayerVFXItem } from '@galacean/effects';
import { calcBezier } from '../animate/bezier-easing';

export function getValOnCubicBezier (
  options: {
    x?: number,
    y?: number,
    LUT: { x: number[], y: number[] },
  },
) {
  const { x, y, LUT } = options;

  if (x && y) {
    throw new Error('cannot provide known x and known y');
  }
  if (x === undefined && y === undefined) {
    throw new Error('must provide EITHER a known x OR a known y');
  }
  let knw: 'x' | 'y';
  let unk: 'x' | 'y';

  if ('x' in options) {
    knw = 'x';
    unk = 'y';
  } else {
    knw = 'y';
    unk = 'x';
  }

  for (let i = 1; i < 100; i++) {
    const num = options[knw]!;

    if (num >= LUT[knw][i] && num <= LUT[knw][i + 1]) {
      const linearInterpolationValue = num - LUT[knw][i];

      return LUT[unk][i] + linearInterpolationValue;
    }
  }
}

export function getLUTOnCubicBezier (easing: [number, number, number, number]) {
  const [x1, y1, x2, y2] = easing;

  const LUT: { x: number[], y: number[] } = {
    x: [],
    y: [],
  };

  for (let i = 0; i < 100; i++) {
    const t = i / 100;

    LUT.x.push(calcBezier(t, x1, x2));
    LUT.y.push(calcBezier(t, y1, y2));
  }

  return LUT;
}

export function screenPositionToWorldPosition (camera: PlayerCamera, canvasBounding: DOMRect, [clientX, clientY]: [number, number], z = 0) {
  const viewProjection = camera.getViewProjectionMatrix().toArray();
  const invVP = camera.getInverseViewProjectionMatrix().toArray();
  const pos: [number, number] = [0, 0];
  const nz = vec3MulMat4(pos, [0, 0, z], viewProjection)[2];
  const [x, y] = getViewPositionByClientPosition(canvasBounding, [clientX, clientY]);

  vec3MulMat4(pos, [x, y, nz], invVP);

  return pos;
}

function getViewPositionByClientPosition (canvasBounding: DOMRect, [clientX, clientY]: [number, number]) {
  const rect = canvasBounding;
  const { left, top, width, height } = rect;
  const canvasCenterPoint = {
    x: left + width / 2,
    y: top + height / 2,
  };

  return [
    (clientX - canvasCenterPoint.x) / width * 2,
    -(clientY - canvasCenterPoint.y) / height * 2,
  ];
}

/* eslint-disable */
function vec3MulMat4(e: number[], t: any, r: number[]){var n=t[0],i=t[1],t=t[2],o=r[3]*n+r[7]*i+r[11]*t+r[15];return e[0]=(r[0]*n+r[4]*i+r[8]*t+r[12])/(o=o||1),e[1]=(r[1]*n+r[5]*i+r[9]*t+r[13])/o,e[2]=(r[2]*n+r[6]*i+r[10]*t+r[14])/o,e;}
/* eslint-enable */

export async function sleepForFrames (frameCount = 4) {
  for (let i = 0; i < frameCount; i++) {
    await sleepForOneFrame();
  }
}

export function assertExist <T> (item: T | void | undefined | null, msg = ''): asserts item is T {
  if (item === undefined || item === null) {
    throw new Error('GE Swiper: item doesn\'t exist: ' + msg);
  }
}

export function sleepForOneFrame () {
  return new Promise(resolve => {
    window.requestAnimationFrame(resolve);
  });
}

export function sleep (ms: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms);
  });
}

export function clamp (value: number, min?: number, max?: number): number {
  const fixedMin = min === undefined || isNaN(min) ? -Infinity : min;
  const fixedMax = max === undefined || isNaN(max) ? Infinity : max;
  const lower = Math.min(fixedMin, fixedMax);
  const upper = Math.max(fixedMin, fixedMax);

  return Math.min(Math.max(value, lower), upper);
}

export function findItemById (rootItem: PlayerVFXItem, id: string): PlayerVFXItem | undefined {
  if (rootItem.id === id) {
    return rootItem;
  }

  const queue: PlayerVFXItem[] = [];

  queue.push(...rootItem.children);
  let index = 0;

  while (index < queue.length) {
    const item = queue[index];

    index++;
    if (item.id === id) {
      return item;
    }
    queue.push(...item.children);
  }

  return undefined;
}

export function findItemByName (rootItem: PlayerVFXItem, name: string): PlayerVFXItem | undefined {
  if (rootItem.name === name) {
    return rootItem;
  }

  const queue: PlayerVFXItem[] = [];

  queue.push(...rootItem.children);
  let index = 0;

  while (index < queue.length) {
    const item = queue[index];

    index++;
    if (item.name === name) {
      return item;
    }
    queue.push(...item.children);
  }

  return undefined;
}

export const lerp = (de: number, xe: number, Pe: number) => de * (1 - Pe) + xe * Pe; // f

