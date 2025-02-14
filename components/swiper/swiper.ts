import BezierEasing from 'bezier-easing';
import type { Disposable } from '@galacean/effects';
import { math } from '@galacean/effects';
import type { SwiperOptions } from './types';
import { toRotate, toDegree, getValOnCubicBezier, formatNum } from './utils';

const cubicBezier = {
  xs: [0, 0.25, 0.25, 1],
  ys: [0, 0.1, 1, 1],
};
const swipeEasing = BezierEasing(0.23, 0.18, 0.14, 1);

export class Swiper implements Disposable {
  /**
   * 卡片总数
   * @internal
   */
  cardCount = 0;
  /**
   * degree 对应的弧度
   * @internal
   */
  private rotate: number;
  private degree: number;
  private radius: number;
  private widthRatio: number;
  private distance = 0;
  private swipeTime: number;
  /**
   * 总共允许的旋转角度范围
   * @internal
   */
  private totalDegree = 0;
  /**
   * 当前卡片 ID
   * @internal
   */
  private currentCardIndex = 0;
  /**
   * 当前正在播放的 ID
   * @internal
   */
  private currentPlayId = 0;
  /**
   * 点击触发动画
   * @internal
   */
  private playingClick = false;
  /**
   * 拖拽触发动画，点击与拖拽触发的动画不能同时响应，否则容易混乱
   * @internal
   */
  private playingDrag = false;
  private playCanceled: Record<number, boolean> = {};
  private beginX: number | null = null;
  private prevX: number | null = null;
  /**
   * 从当前 cardIndex 为起始计算的转动角，向右转增大
   * @internal
   */
  private currentRotate = 0;
  /**
   * 已经拖拽的角度
   * @internal
   */
  private draggedRotate = 0;
  /**
   * 当前 index 卡片往右拖动/往左拖动的最大角度（弧度）
   * @internal
   */
  private maxDragRotate: [number, number] = [0, 0];

  constructor (
    public readonly target: HTMLElement,
    private readonly options: SwiperOptions,
  ) {
    const {
      widthRatio = 0.01,
      radius = 4,
      degree = 37,
      initCardIndex = 0,
      cardCount,
      swipeTime = 300,
    } = this.options;

    this.widthRatio = widthRatio;
    this.rotate = toRotate(degree);
    this.degree = degree;
    this.radius = radius;
    this.swipeTime = swipeTime;
    this.distance = radius * Math.sin(this.rotate);
    this.cardCount = cardCount;
    this.totalDegree = (cardCount - 1) * this.degree;
    this.currentCardIndex = math.clamp(initCardIndex, 0, this.cardCount - 1);

    this.bindDragEvent();
  }

  isPlaying () {
    return this.playingDrag || this.playingClick;
  }

  /**
   * 移动到指定 index 对应的卡片
   * @param index - 范围 [0, card.length - 1]
   */
  gotoCardIndex (index: number) {
    if (index < 0 || index > this.cardCount - 1) {
      console.error(
        `Error: Card index out of range, must in [0, ${this.cardCount - 1}].`,
      );

      return;
    }
    if (this.isPlaying()) {
      return;
    }

    const diff = this.currentCardIndex - index;

    if (diff !== 0) {
      this.gotoDegree(this.degree * diff);
    }
  }

  private gotoDegree (degree: number) {
    if (this.playingDrag) {
      return;
    }
    if (!this.cardCount) {
      console.error('goCardError: data not ready.');

      return;
    }
    this.playingClick = true;
    this.stopCurrentPlay();

    window.requestAnimationFrame(time => {
      this.draggedRotate = this.currentRotate;
      const addCount = Math.round(-toRotate(degree) / this.rotate);
      let newIndex = 0;

      if (this.currentCardIndex + addCount >= 0) {
        newIndex =
          addCount + this.currentCardIndex > this.cardCount - 1
            ? this.cardCount - 1
            : addCount + this.currentCardIndex;
      }

      const totalDegree = degree + toDegree(this.currentRotate);
      const totalRotate = toRotate(totalDegree);
      const beginTime = time;
      const playedPercent = this.draggedRotate / totalRotate;
      const x = getValOnCubicBezier({ y: playedPercent, cubicBezier }) ?? 0;
      const duration = this.swipeTime;

      this.increaseCurrentPlayId();
      this.playRotate({
        time: beginTime,
        beginTime: beginTime - ((x * duration) >> 0),
        startRotate: 0,
        duration,
        totalRotate,
        newIndex,
        currentPlayId: this.currentPlayId,
      });
    });
  }

  private bindDragEvent () {
    const handleDragStart = () => {
      if (this.isPlaying()) {
        return;
      }
      this.stopCurrentPlay();

      this.prevX = null;
      this.beginX = null;
      this.draggedRotate = this.currentRotate;
      this.maxDragRotate = [
        toRotate(this.currentCardIndex * this.degree - this.currentRotate),
        toRotate(
          (this.cardCount - this.currentCardIndex - 1) * this.degree +
          this.currentRotate,
        ),
      ];
      this.removeEventListener();
      this.addEventListener();
    };

    this.target.addEventListener('touchstart', handleDragStart);
    this.target.addEventListener('mousedown', handleDragStart);
  }

  private addEventListener () {
    this.target.addEventListener('touchmove', this.handleDragMove);
    this.target.addEventListener('mousemove', this.handleDragMove);
    this.target.addEventListener('touchend', this.handleDragEnd);
    this.target.addEventListener('touchcancel', this.handleDragEnd);
    window.addEventListener('mouseup', this.handleDragEnd, true);
  }

  private removeEventListener () {
    this.target.removeEventListener('touchmove', this.handleDragMove);
    this.target.removeEventListener('mousemove', this.handleDragMove);
    this.target.removeEventListener('touchend', this.handleDragEnd);
    this.target.removeEventListener('touchcancel', this.handleDragEnd);
    window.removeEventListener('mouseup', this.handleDragEnd, true);
  }

  private handleDragMove = (event: TouchEvent | MouseEvent) => {
    let { clientX } = event as MouseEvent;

    if ('touches' in event) {
      clientX = event.touches[0].clientX;
    }

    if (this.prevX === null) {
      this.beginX = clientX;
      this.prevX = clientX;
      this.draggedRotate = this.currentRotate;
      this.stopCurrentPlay();
    }

    const distance = (clientX - this.prevX) * this.widthRatio;
    const temp = distance / this.radius;
    let rotate = Math.asin(Math.abs(temp) > 1 ? Math.sign(temp) : temp);
    const draggedRotate = this.draggedRotate + rotate;

    if (
      draggedRotate >= this.maxDragRotate[0] ||
      draggedRotate <= -this.maxDragRotate[1]
    ) {
      rotate = 0;
    }
    this.currentRotate += rotate;
    this.draggedRotate += rotate;
    const currenTotalDegree =
      this.currentCardIndex * this.degree - toDegree(this.currentRotate);

    this.options.onProgress?.(
      formatNum(currenTotalDegree / this.totalDegree, 3), this.currentCardIndex
    );
    this.prevX = clientX;
  };

  private handleDragEnd = () => {
    this.removeEventListener();
    if (this.draggedRotate) {
      this.playingDrag = true;
      const back = Math.abs(this.draggedRotate) < toRotate(this.degree / 20);

      this.playSwipe(back);
    }
  };

  private playSwipe (back = false) {
    // 用户拖动的距离
    const draggedDegree = toDegree(this.draggedRotate);
    // 应当改变的卡片数
    const addCount = back
      ? 0
      : Math.ceil(Math.abs(draggedDegree) / this.degree) *
      Math.sign(draggedDegree);
    // 新的卡片 index
    let newIndex = 0;

    if (this.currentCardIndex - addCount >= 0) {
      newIndex =
        this.currentCardIndex - addCount > this.cardCount - 1
          ? this.cardCount - 1
          : this.currentCardIndex - addCount;
    }
    this.options.onGotoCard?.(newIndex);
    // 开始转动的角度
    const startRotate = this.currentRotate;

    this.stopCurrentPlay();

    if (back) {
      window.requestAnimationFrame(time => {
        const beginTime = time;
        const totalDegree = (draggedDegree % this.degree) * -1;
        const duration = (Math.abs(totalDegree) / this.degree) * this.swipeTime;
        const totalRotate = toRotate(totalDegree);

        this.increaseCurrentPlayId();
        this.playRotate({
          time: beginTime,
          beginTime,
          startRotate,
          duration,
          totalRotate,
          newIndex,
          currentPlayId: this.currentPlayId,
          back,
        });
      });
    } else {
      // 总共需要转动的角度
      const totalDegree = this.degree * addCount;

      window.requestAnimationFrame(time => {
        // 已经转完的比例
        const playedPercent = draggedDegree / totalDegree;
        const x = getValOnCubicBezier({ y: playedPercent, cubicBezier }) ?? 0;
        // 转动时间
        const duration = this.swipeTime * Math.abs(addCount);
        const totalRotate = toRotate(totalDegree);

        this.increaseCurrentPlayId();
        this.playRotate({
          time,
          beginTime: time - ((x * duration) >> 0),
          startRotate: 0,
          duration,
          totalRotate,
          newIndex,
          currentPlayId: this.currentPlayId,
          back,
        });
      });
    }
  }

  private playRotate (options: Record<string, any>) {
    const {
      currentPlayId,
      time: newTime,
      beginTime,
      startRotate,
      duration,
      totalRotate,
      newIndex,
    } = options;
    const stopPlay = this.playCanceled[+currentPlayId];
    let percent = Math.min(1, (+newTime - +beginTime) / +duration);

    if (stopPlay) {
      return;
    }

    percent = swipeEasing(percent);
    this.currentRotate = +startRotate + percent * +totalRotate;
    const currenTotalDegree =
      this.currentCardIndex * this.degree - toDegree(this.currentRotate);

    this.options.onProgress?.(
      formatNum(currenTotalDegree / this.totalDegree, 3), this.currentCardIndex
    );

    if (percent < 1) {
      window.requestAnimationFrame(time => {
        this.playRotate({ ...options, time });
      });
    } else {
      this.currentCardIndex = +newIndex;
      this.currentRotate = 0;
      this.playingClick = false;
      this.playingDrag = false;
    }
  }

  private increaseCurrentPlayId () {
    this.currentPlayId = (this.currentPlayId + 1) % 100;
    this.playCanceled[this.currentPlayId] = false;
  }

  private stopCurrentPlay () {
    this.playCanceled[this.currentPlayId] = true;
  }

  dispose (): void {
    this.removeEventListener();
  }
}
