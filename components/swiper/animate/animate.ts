/**
 Smoothly scroll element to the given target (element.scrollTop)
 for the given duration

 Returns a promise that's fulfilled when done, or rejected if
 interrupted
 */

import { bezier as BezierEasing } from './bezier-easing';

export type AnimateStatus = {
  canceled: boolean,
  finishImmediately?: () => void,
};

export const animate = function ({
  duration = 0,
  easing = [0.25, 0.1, 0.25, 1],
  onProgress,
  status,
  requestAF,
}: {
  duration: number,
  easing?: [number, number, number, number],
  onProgress: (progress: number, speed: number) => void,
  status?: AnimateStatus,
  requestAF?: (fn: (time: number) => void) => void,
}) {
  let canceled = false;
  const bezierEasing = BezierEasing(...easing);

  if (duration === 0) {
    onProgress(1, 0);

    return Promise.resolve();
  }

  const isLinear = easing[0] === easing[1] && easing[2] === easing[3];

  let start_time = 0;
  let end_time = 0;

  const start_top = 0;
  const distance = 1;

  // based on http://en.wikipedia.org/wiki/Smoothstep
  const smooth_step = function (start: number, end: number, time: number) {
    if (time <= start) {
      return 0;
    }
    if (time >= end) {
      return 1;
    }
    const x = (time - start) / (end - start); // interpolation

    // return x*x*(3 - 2*x);
    return isLinear ? x : bezierEasing.easing(x);
  };

  if (status) {
    status.finishImmediately = () => {
      canceled = true;
      onProgress(1, 0);
    };
  }

  return new Promise<void>(function (resolve) {
    let prevTime = 0;
    let prevProgress = 0;
    // This is like a think function from a game loop
    const scroll_frame = function (time: number) {
      if (canceled || status?.canceled) {
        resolve();

        return;
      }
      // set the scrollTop for this frame
      const point = smooth_step(start_time, end_time, time);
      const progress = start_top + distance * point;
      const speed = time === prevTime ? 0 : (progress - prevProgress) / (time - prevTime);

      onProgress(progress, speed * duration);
      prevTime = time;
      prevProgress = progress;

      // check if we're done!
      if (time >= end_time) {
        resolve();

        return;
      }

      // schedule next frame for execution
      (requestAF ?? window.requestAnimationFrame)(scroll_frame);
    };

    // boostrap the animation process
    (requestAF ?? window.requestAnimationFrame)(time => {
      start_time = time;
      end_time = start_time + duration;
      prevTime = time;
      scroll_frame(time);
    });
  });
};

export function getValueByProgress (start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}
