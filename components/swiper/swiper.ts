import { getLUTOnCubicBezier, getValOnCubicBezier, screenPositionToWorldPosition } from './common/utils';
import { bezier as BezierEasing } from './animate/bezier-easing';
import { clamp } from './common/utils';
import type { SwiperData } from './data/swiper-data';
import type { SwiperController } from './controllers/swiper-controller';
import { swiperControllerMap } from './controllers/swiper-controller-map';
import './controllers/horizontal-controller';
import type { SwiperHandlers } from './data/types';
import type { Composition, VFXItem as PlayerVFXItem } from '@galacean/effects';
import { Camera as PlayerCamera } from '@galacean/effects';
import { animate } from './animate/animate';
import { RenderComponent, RenderScheduler } from './common/render-component';

export class Swiper {
  /**
   * 卡片总数
   * @internal
   */
  cardCount = 0;
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
  private playCanceled: Record<number, boolean> = {};
  prevX = 0;
  private prevY = 0;
  startX = 0;
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

  controller: SwiperController;

  target: HTMLElement;
  composition?: Composition;
  readonly cameraOptions: any;
  canvasBounding: DOMRect;
  private prevCanvasBounding: DOMRect;
  swipeEasing: ReturnType<typeof BezierEasing>;
  private readonly swipeEasingLUT: { x: number[], y: number[] };
  currentDirection = 0; // 1向右，-1向左
  private prevDragTime = 0; // 记录上一次拖拽的时间，用来计算拖拽速度
  private dragStartClientPos = 0;
  private dragEndClientPos = 0;
  private autoPlayStop = false;
  disableDrag = false; // 临时禁用滑动
  disableControl = false;
  private camera: PlayerCamera;
  private progressInCard = 0;
  widthRatio = 1; // world to screen 宽度比例
  downgrade = false;
  autoPause = true;
  handlers: SwiperHandlers = {};
  disposed = false;
  playingEnterAnimation = false;
  renderScheduler: RenderScheduler;

  constructor (
    { target, composition, cameraOptions, controlItems, controlElements, cardCount, downgrade, autoPause }: {
      target: HTMLElement,
      composition?: Composition,
      cameraOptions: any,
      controlItems?: PlayerVFXItem[], // 正常slide GE元素
      controlElements?: HTMLElement[], // 降级slide DOM元素
      cardCount?: number,
      downgrade?: boolean,
      autoPause?: boolean,
    },
    private readonly options: SwiperData,
    handlers: SwiperHandlers,
  ) {
    this.target = target;
    this.handlers = handlers;
    this.composition = composition;
    this.cameraOptions = cameraOptions;
    this.downgrade = downgrade ?? false;
    this.autoPause = autoPause ?? true;

    let renderComponent: RenderComponent | null = null;

    if (composition) {
      renderComponent = composition.rootItem.addComponent(RenderComponent);
    }
    this.renderScheduler = new RenderScheduler(renderComponent);

    this.cardCount = cardCount || controlItems?.length || controlElements?.length || 0;
    this.currentCardIndex = clamp(this.options.initCardIndex, 0, this.cardCount - 1);
    this.swipeEasing = BezierEasing(...this.options.swipeEasing);
    this.swipeEasingLUT = getLUTOnCubicBezier(this.options.swipeEasing);

    const Controller = swiperControllerMap[this.options.effectTemplate];

    if (!Controller) {
      throw new Error('Swiper effect template not found: ' + this.options.effectTemplate);
    }
    // @ts-expect-error
    this.controller = new Controller(this.options, this);
    this.updateLength();
    this.totalDegree = (this.cardCount - (options.loop ? 0 : 1)) * this.options.slideDistance;

    this.bindDragStartEvent();
    this.controller.run(controlItems, controlElements);
  }

  setControlItems (items: PlayerVFXItem[]) {
    this.controller.cardItems = items;
  }

  getControlItems () {
    return this.controller.cardItems;
  }

  beginAutoPlay () {
    if (!this.options.autoPlay || !this.options.autoPlaySpeed) {
      return;
    }
    this.autoPlayStop = false;
    const currentPlayId = this.increaseCurrentPlayId();

    window.setTimeout(() => {
      if (this.disposed) {
        return;
      }
      this.renderScheduler.requestAnimationFrame(time => {
        if (this.playCanceled[currentPlayId]) {
          return;
        }
        this.currentDirection = 1;
        this.playRotate({
          time,
          beginTime: time,
          startRotate: 0,
          duration: this.options.swipeTime * 1000 / this.options.autoPlaySpeed,
          totalRotate: -this.options.slideDistance,
          newIndex: this.getNextIndex(),
          currentPlayId,
          back: false,
        });
      });
    }, this.options.autoPlayInterval * 1000);
  }

  stopAutoPlay () {
    this.autoPlayStop = true;
  }

  getNextIndex () {
    return (this.currentCardIndex + 1) % this.cardCount;
  }

  getPrevIndex () {
    return (this.currentCardIndex - 1 + this.cardCount) % this.cardCount;
  }

  /**
   * 移动到指定 index 对应的卡片
   * @param index - 范围 [0, card.length - 1]
   */
  async gotoSlideIndex (index: number, { direction, duration }: { direction?: -1 | 1, duration?: number } = {}) {
    if (index < 0 || index > this.cardCount - 1 || isNaN(index)) {
      console.error(
        `Error: Slide index(${index}) out of range, must in [0, ${this.cardCount}).`,
      );

      return;
    }
    if (index === this.getCurrentIndex() && !this.currentRotate) {
      return;
    }
    if (this.playingEnterAnimation) {
      return;
    }
    if (this.disableControl) {
      return;
    }

    this.handlers.onWillGotoCard?.(index, { isFastDrag: false, isGoto: true });
    this.draggedRotate = 0;
    let diff = index - this.currentCardIndex;

    this.currentDirection = diff === 0 ? Math.sign(this.currentRotate) : Math.sign(diff);

    if (this.options.loop && direction && this.currentDirection !== direction) {
      this.currentDirection *= -1;
      diff += this.cardCount * direction;
    }
    await this.fastPlay(Math.abs(diff), {
      playDuration: duration,
    });
  }

  /**
   * 获取当前卡片的 index
   * @returns
   */
  getCurrentIndex () {
    return this.currentCardIndex;
  }

  private bindDragStartEvent () {
    this.target.addEventListener('touchstart', this.handleDragStart);
    this.target.addEventListener('mousedown', this.handleDragStart);
  }

  private removeDragStartEvent () {
    this.target.removeEventListener('touchstart', this.handleDragStart);
    this.target.removeEventListener('mousedown', this.handleDragStart);
  }

  private addMoveEventListener () {
    document.addEventListener('touchmove', this.handleDragMove);
    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('touchend', this.handleDragEnd);
    document.addEventListener('touchcancel', this.handleDragEnd);
    document.addEventListener('mouseup', this.handleDragEnd, true);
  }

  private removeMoveEventListener () {
    document.removeEventListener('touchmove', this.handleDragMove);
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('touchend', this.handleDragEnd);
    document.removeEventListener('touchcancel', this.handleDragEnd);
    document.removeEventListener('mouseup', this.handleDragEnd, true);
  }

  updateLength () {
    this.canvasBounding = this.handlers.getCanvasBounding?.() ?? this.target.getBoundingClientRect();
    if (this.canvasBounding.width === 0 || this.canvasBounding.height === 0) {
      return;
    }
    if (!this.camera || this.prevCanvasBounding && (this.prevCanvasBounding.width !== this.canvasBounding.width || this.prevCanvasBounding.height !== this.canvasBounding.height)) {
      const { width, height, left } = this.canvasBounding;

      this.camera = new PlayerCamera('camera', { ...this.cameraOptions, aspect: width / height });
      const worldX = screenPositionToWorldPosition(this.camera, this.canvasBounding, [left, 0], this.controller.getDistanceZ())[0];

      this.widthRatio = Math.abs(worldX) / (width * 0.5);
      this.setWorldLengthToScreenLength();
    }
  }

  private setWorldLengthToScreenLength () {
    if (this.downgrade) {
      this.options.radius = this.options.radius / this.widthRatio;
      this.options.slideDistance = this.options.slideDistance / this.widthRatio;
    }
  }

  private handleDragStart = (event: TouchEvent | MouseEvent) => {
    if (this.disableDrag || this.disableControl) {
      return;
    }
    if (this.handlers.getDisableDrag?.()) {
      return;
    }

    this.dragStartClientPos = this.getPosX(event);
    this.stopCurrentPlay();
    this.updateLength();

    this.draggedRotate = this.currentRotate;
    if (!this.options.loop) {
      let right = this.currentCardIndex * this.options.slideDistance;
      let left = (this.cardCount - this.currentCardIndex - 1) * this.options.slideDistance;

      // 允许在边缘的时候有一个弹性效果
      if (this.cardCount > 1) {
        right += this.options.slideDistance * 0.5;
        left += this.options.slideDistance * 0.5;
      }
      this.maxDragRotate = [right, -left];
    }

    this.prevX = this.getPosX(event);
    this.prevY = this.getPosY(event);
    this.startX = this.prevX;
    this.prevDragTime = Date.now();
    this.draggedRotate = this.currentRotate;
    this.prevCanvasBounding = this.canvasBounding;

    this.removeMoveEventListener();
    this.addMoveEventListener();
  };

  private handleDragMove = (event: TouchEvent | MouseEvent) => {
    if (this.handlers.getDisableDrag?.()) {
      return;
    }
    const posX = this.getPosX(event);

    if (posX === this.prevX) {
      return;
    }
    const posY = this.getPosY(event);
    const prevX = this.prevX;
    const prevY = this.prevY;

    this.prevX = posX;
    this.prevY = posY;
    if (this.options.enableFastDrag) {
      this.dragEndClientPos = this.getPosX(event); // touchend事件没有坐标
    }
    if (Math.abs(posX - prevX) < Math.abs(posY - prevY)) {
      return;
    }

    const ratio = this.downgrade ? 1 : this.widthRatio;
    let distance = this.controller.getDistance((posX - prevX) * ratio, posX - this.startX) * this.options.dragStepRatio;
    const draggedRotate = this.draggedRotate + distance;
    const direction = -Math.sign(distance);

    if (
      !this.options.loop && (
        draggedRotate >= this.maxDragRotate[0] ||
        draggedRotate <= this.maxDragRotate[1]
      )) {
      distance = 0;
    }
    const prevDraggedRotate = this.draggedRotate;

    this.draggedRotate += distance;
    // 已经开始拖动，回到中间，则不用判断
    if (!this.currentDirection && Math.abs(this.draggedRotate / ratio) < this.options.startPanThreshold) {
      return;
    }
    if (this.draggedRotate === 0 || Math.sign(prevDraggedRotate) !== Math.sign(this.draggedRotate)) {
      this.controller.onDragSwap();
    }
    if (this.cardCount > 1) {
      this.draggedRotate %= this.totalDegree;
    }
    if (direction && this.currentDirection && this.currentDirection !== direction) {
      this.controller.onDragDirectionReverse();
    }
    this.currentDirection = direction;

    // 拖的距离超过一张卡片的距离，自动切换卡片
    if (Math.abs(this.draggedRotate) >= this.options.slideDistance) {
      const count = Math.floor(Math.abs(this.draggedRotate) / this.options.slideDistance);

      this.currentCardIndex = (this.currentCardIndex + this.currentDirection * count + this.cardCount) % this.cardCount;
      this.draggedRotate += this.options.slideDistance * this.currentDirection * count;
      this.startX = posX;
      this.controller.onDragExceedSlide();
    }

    this.currentRotate = this.draggedRotate;

    this.triggerProgressEvents({ isDrag: true });
  };

  private getPosX (event: TouchEvent | MouseEvent) {
    const eventData = 'touches' in event ? event.touches[0] : event;
    const { clientX, clientY } = eventData;
    const vecIndex = this.controller.chooseXY();

    return [clientX, clientY][vecIndex];
  }

  private getPosY (event: TouchEvent | MouseEvent) {
    const eventData = 'touches' in event ? event.touches[0] : event;
    const { clientX, clientY } = eventData;
    const vecIndex = this.controller.chooseXY();

    return [clientX, clientY][1 - vecIndex];
  }

  updateTransform (speed?: number) {
    const progressInCard = this.getProgressInCard();
    let progressInTotal = ((this.currentCardIndex - progressInCard) / (this.cardCount - (this.options.loop ? 0 : 1)) + 1) + Number.EPSILON;

    if (this.options.loop) {
      progressInTotal %= 1;
    } else {
      progressInTotal = clamp(Math.abs(progressInTotal) - 1, 0, 1);
    }

    this.controller.updateTransform(progressInCard, progressInTotal, speed);
    this.progressInCard = progressInCard;

    return { progressInTotal, progressInCard };
  }

  triggerProgressEvents ({ speed, leftCount, isDrag, disableIdle }: { speed?: number, leftCount?: number, isDrag?: boolean, disableIdle?: boolean } = {}) {
    const direction = this.currentDirection;

    if (direction === 0) {
      return;
    }

    const { progressInCard, progressInTotal } = this.updateTransform(speed);

    let slideInIndex = 0;
    let slideOutIndex = 0;
    let slideInProgress = 0;
    let slideOutProgress = 0;

    let side: 'left' | 'right' = 'left';

    if (progressInCard < 0 || progressInCard === 0 && this.progressInCard < 0) { // 整体在当前卡片的左边
      side = 'left';
      if (direction > 0) { // 向右滑动
        slideInIndex = this.getNextIndex();
        slideOutIndex = this.currentCardIndex;
        slideInProgress = -progressInCard;
        slideOutProgress = -progressInCard;
      } else { // 向左滑动
        slideInIndex = this.currentCardIndex;
        slideOutIndex = this.getNextIndex();
        slideInProgress = 1 + progressInCard;
        slideOutProgress = 1 + progressInCard;
      }
    } else { // 整体在当前卡片的右边
      side = 'right';
      if (direction > 0) { // 向右滑动
        slideInIndex = this.currentCardIndex;
        slideOutIndex = this.getPrevIndex();
        slideInProgress = 1 - progressInCard;
        slideOutProgress = 1 - progressInCard;
      } else { // 向左滑动
        slideInIndex = this.getPrevIndex();
        slideOutIndex = this.currentCardIndex;
        slideInProgress = progressInCard;
        slideOutProgress = progressInCard;
      }
    }

    const opposite = side === 'left' ? 'right' : 'left';

    this.handlers.onSlideIn?.(slideInIndex, slideInProgress, { speed, leftCount, isDrag, side: slideInIndex === this.currentCardIndex ? side : opposite });
    this.handlers.onSlideOut?.(slideOutIndex, slideOutProgress, { speed, leftCount, isDrag, side: slideOutIndex === this.currentCardIndex ? side : opposite });
    if (!disableIdle) {
      const idleSlideIndexList: number[] = [];

      for (let i = 0; i < this.cardCount; i++) {
        if (i !== slideInIndex && i !== slideOutIndex) {
          idleSlideIndexList.push(i);
        }
      }
      this.handlers.onSlidesIdle?.(idleSlideIndexList);
    }

    const progressData = {
      speed,
      dragDirection: this.currentDirection,
      totalDirection: progressInCard === 0 ? 0 : -Math.sign(progressInCard),
      progressInSlide: Math.abs(progressInCard),
    };

    this.handlers.onProgress?.(progressInTotal, progressData);
    this.controller.onProgress(progressInTotal, progressData);
    this.progressInCard = progressInCard;
  }

  private getProgressInCard () {
    const perCardDistance = this.options.slideDistance;

    return this.currentRotate / perCardDistance;
  }

  private handleDragEnd = (event: TouchEvent | MouseEvent) => {
    this.removeMoveEventListener();
    if (!this.currentDirection) {
      return;
    }
    let normalPlay = true;

    if (this.options.enableFastDrag) {
      const now = Date.now();
      const dragSpeed = Math.abs(this.dragEndClientPos - this.dragStartClientPos) / (now - this.prevDragTime);

      if (dragSpeed > this.options.fastDragThreshold) {
        normalPlay = false;
        const playSlideCount = Math.round(clamp(Math.sqrt(Math.round(dragSpeed * 5)), 1, 10) * this.options.fastDragAmplitude);

        this.handlers.onWillGotoCard?.((this.currentCardIndex + playSlideCount * this.currentDirection + this.cardCount * 10) % this.cardCount, { isFastDrag: true, isGoto: false });
        void this.fastPlay(playSlideCount);
      }
    }

    if (normalPlay) {
      const diffFromStartX = this.prevX - this.startX;
      let back = this.controller.willPlayBack(this.getProgressInCard());

      if (back === undefined) {
        back = !this.options.loop && (
          this.currentCardIndex === this.cardCount - 1 && this.draggedRotate < 0
            || this.currentCardIndex === 0 && this.draggedRotate > 0)
          || Math.abs(this.draggedRotate) < this.controller.getDistance(this.options.slideDistance, diffFromStartX) * this.options.playBackRatio;
      }
      this.playSwipe(back);
    }
  };

  async fastPlay (
    playSlideCount: number, {
      playDuration,
      beginSlideIndex,
      easing = [0.115, 0, 0.002, 1],
      disableEvent = 'none',
      status = { canceled: false },
    }: {
      playDuration?: number,
      beginSlideIndex?: number,
      easing?: [number, number, number, number],
      disableEvent?: 'none' | 'total' | 'keepLast',
      status?: { canceled: boolean },
    } = {}
  ) {
    const playId = this.increaseCurrentPlayId();
    const { slideDistance } = this.options;

    const playTotalDegree = slideDistance * playSlideCount * -this.currentDirection - this.currentRotate;
    const beginCardIndex = beginSlideIndex ?? this.currentCardIndex;

    playDuration ??= Math.sqrt(playSlideCount || 1) * 500 * this.options.fastDragTimeRatio;

    this.draggedRotate = this.currentRotate;

    return animate({ duration: playDuration, status, easing, requestAF: t => this.renderScheduler.requestAnimationFrame(t), onProgress: (progress, speed) => {
      if (this.disposed || this.playCanceled[playId]) {
        status.canceled = true;

        return;
      }
      const playedDegree = playTotalDegree * progress;
      const currentRotate = this.draggedRotate + playedDegree;
      const addCount = progress === 1 ? playSlideCount : Math.floor(Math.abs(currentRotate / slideDistance));
      const leftCount = playSlideCount - addCount;

      this.currentCardIndex = (beginCardIndex + addCount * this.currentDirection + this.cardCount * 10) % this.cardCount;
      this.currentRotate = currentRotate + slideDistance * this.currentDirection * addCount;
      if (disableEvent === 'none' || disableEvent === 'keepLast' && leftCount <= 1) {
        this.triggerProgressEvents({ speed, leftCount, disableIdle: disableEvent === 'keepLast' });
      } else {
        this.updateTransform(speed);
      }
    } }).then(() => {
      if (this.disposed || this.playCanceled[playId]) {
        return;
      }
      this.currentRotate = 0;
      // 循环的时候需要在currentCardIndex改变后修改卡片排列顺序
      this.controller.updateTransform(0, this.getProgress());
      if (disableEvent !== 'total') {
        this.handlers.onSlidePark?.(this.currentCardIndex, { addSlideCount: playSlideCount });
      }
      this.currentDirection = 0;
      if (this.options.autoPlay && !this.autoPlayStop) {
        this.beginAutoPlay();
      }
    }).catch(e => {
      console.error(e);
    });
  }

  private getAddCount () {
    return Math.ceil(Math.abs(this.draggedRotate) / this.options.slideDistance) *
      Math.sign(this.draggedRotate);
  }

  private playSwipe (back = false) {
    // 用户拖动的距离
    const draggedDegree = this.draggedRotate;
    // 应当改变的卡片数
    const addCount = back ? 0 : this.getAddCount();
    // 新的卡片 index
    const newIndex = (this.currentCardIndex - addCount + this.cardCount) % this.cardCount;

    this.handlers.onWillGotoCard?.(newIndex, { isFastDrag: false, isGoto: false });
    this.controller.onWillGotoCard(newIndex);
    // 开始转动的角度
    const startRotate = this.currentRotate;

    let duration = 0;

    if (back) {
      const currentPlayId = this.increaseCurrentPlayId();
      const totalDegree = (draggedDegree % this.options.slideDistance) * -1;

      duration = (Math.abs(totalDegree) / this.options.slideDistance) * this.options.swipeTime * 1000;
      this.currentDirection *= -1;
      this.renderScheduler.requestAnimationFrame(time => {
        const beginTime = time;
        const totalRotate = totalDegree;

        this.playRotate({
          time: beginTime,
          beginTime,
          startRotate,
          duration,
          totalRotate,
          newIndex,
          currentPlayId,
          back,
        });
      });
    } else {
      // 总共需要转动的角度
      const totalDegree = this.options.slideDistance * addCount;

      const currentPlayId = this.increaseCurrentPlayId();

      duration = this.options.swipeTime * 1000 * Math.abs(addCount);
      this.renderScheduler.requestAnimationFrame(time => {
        // 已经转完的比例
        const playedPercent = draggedDegree / totalDegree;
        const x = getValOnCubicBezier({ y: playedPercent, LUT: this.swipeEasingLUT }) ?? 0;
        // 转动时间
        const totalRotate = totalDegree;

        this.playRotate({
          time,
          beginTime: time - ((x * duration) >> 0),
          startRotate: 0,
          duration,
          totalRotate,
          newIndex,
          currentPlayId,
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
      resetPlayTID,
    } = options;
    const stopPlay = this.playCanceled[currentPlayId];

    if (stopPlay) {
      return;
    }

    let percent = Math.min(1, (newTime - beginTime) / duration);

    percent = this.swipeEasing.easing(percent);
    this.currentRotate = startRotate + percent * totalRotate;
    this.triggerProgressEvents();

    if (percent < 1) {
      this.renderScheduler.requestAnimationFrame(time => {
        this.playRotate({ ...options, time });
      });
    } else {
      window.clearTimeout(resetPlayTID);
      this.currentCardIndex = newIndex;
      this.currentRotate = 0;
      this.currentDirection = 0;
      // 循环的时候需要在currentCardIndex改变后修改卡片排列顺序
      this.controller.updateTransform(0, this.getProgress());

      this.handlers.onSlidePark?.(this.currentCardIndex, { addSlideCount: 1 });
      if (this.options.autoPlay && !this.autoPlayStop) {
        this.beginAutoPlay();
      }
    }
  }

  getProgress () {
    return this.currentCardIndex / (this.cardCount - (this.options.loop ? 0 : 1));
  }

  private increaseCurrentPlayId () {
    this.stopCurrentPlay();
    this.currentPlayId = (this.currentPlayId + 1) % 100;
    this.playCanceled[this.currentPlayId] = false;

    return this.currentPlayId;
  }

  stopCurrentPlay () {
    this.playCanceled[this.currentPlayId] = true;
  }

  dispose (): void {
    this.removeDragStartEvent();
    this.removeMoveEventListener();
    this.stopCurrentPlay();
    this.controller.dispose();
    this.disposed = true;
  }
}
