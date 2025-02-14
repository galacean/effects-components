/**
 * 转弧度
 * @param degree
 * @returns
 */
export function toRotate (degree: number) {
  return (degree / 180) * Math.PI;
}

/**
 * 转角度
 * @param rotate
 * @returns
 */
export function toDegree (rotate: number) {
  return (rotate / Math.PI) * 180;
}

export function getValOnCubicBezier (options: {
  x?: number,
  y?: number,
  cubicBezier: Record<string, number[]>,
}) {
  if ('x' in options && 'y' in options) {
    throw new Error('cannot provide known x and known y');
  }
  if (!('x' in options) && !('y' in options)) {
    throw new Error('must provide EITHER a known x OR a known y');
  }
  const { cubicBezier } = options;

  const x1 = cubicBezier.xs[0];
  const x2 = cubicBezier.xs[1];
  const x3 = cubicBezier.xs[2];
  const x4 = cubicBezier.xs[3];

  const y1 = cubicBezier.ys[0];
  const y2 = cubicBezier.ys[1];
  const y3 = cubicBezier.ys[2];
  const y4 = cubicBezier.ys[3];

  const LUT: Record<string, number[]> = {
    x: [],
    y: [],
  };

  for (let i = 0; i < 100; i++) {
    const t = i / 100;

    LUT.x.push(
      (1 - t) * (1 - t) * (1 - t) * x1 +
      3 * (1 - t) * (1 - t) * t * x2 +
      3 * (1 - t) * t * t * x3 +
      t * t * t * x4,
    );
    LUT.y.push(
      (1 - t) * (1 - t) * (1 - t) * y1 +
      3 * (1 - t) * (1 - t) * t * y2 +
      3 * (1 - t) * t * t * y3 +
      t * t * t * y4,
    );
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

export function formatNum (x: number, n = 3) {
  return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
}

export function clamp (v: number, min: number, max: number): number {
  return v > max ? max : (v < min ? min : v);
}
