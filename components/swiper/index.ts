import type { Player, Disposable, VFXItem, Composition } from '@galacean/effects';
import { math } from '@galacean/effects';
import BezierEasing from 'bezier-easing';
import { toRotate, toDegree, getValOnCubicBezier } from './utils';

/**
 *
 */
export type SwiperOptions = {
  /**
   * 半径
   */
  radius?: number,
  /**
   * 卡片的间隔角度，影响缩放比例
   */
  degree?: number,
  /**
   * 滑动时间
   */
  swipeTime?: number,
  /**
   * 卡片父节点 ID 列表
   */
  cardIdList: string[],
  /**
   * 无效的父节点 ID
   */
  uselessCardIdList?: string[],
  /**
   * 初始时的卡片 ID
   */
  initCardIndex?: number,
  /**
   * 宽度系数，影响滑动难易程度，手指滑动距离相同时，越小则卡片移动的距离越小
   */
  widthRatio?: number,
  /**
   * 当前角度在总角度中的占比，0 表示在最左侧，1 表示在最右侧
   * @param {number} progress
   */
  onProgress?: (progress: number) => void,
  /**
   * 转动到 cardIndex 对应卡片时的回调
   * @param {number} cardIndex
   */
  onGotoCard?: (cardIndex: number) => void,
  // TODO: 待实现
  onClickCard?: () => void,
};

const cubicBezier = {
  xs: [0, .25, .25, 1],
  ys: [0, .1, 1, 1],
};
const swipeEasing = BezierEasing(0.23, 0.18, 0.14, 1);

/**
 *
 */
export class Swiper implements Disposable {
  /**
   * Player 的容器
   */
  public readonly container: HTMLElement | null;

  /**
   * 卡片数组
   * @internal
   */
  private readonly cardItems: VFXItem[] = [];
  private cardCount = 0;
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
  private maxDragRotate: [number, number];

  /**
   *
   * @param player
   * @param options
   */
  constructor (
    private readonly player: Player,
    private readonly options: SwiperOptions,
  ) {
    const {
      widthRatio = 0.01,
      radius = 4,
      degree = 36.87,
      initCardIndex = 0,
      swipeTime = 600,
    } = this.options;

    this.container = player.container;
    this.widthRatio = widthRatio;
    this.rotate = toRotate(degree);
    this.degree = degree;
    this.radius = radius;
    this.swipeTime = swipeTime;
    this.distance = radius * Math.sin(this.rotate);
    this.currentCardIndex = initCardIndex;
  }

  /**
   * 开始播放，在 player.loadScene 后运行，传入composition
   * @param composition - player.loadScene 返回的对象
   */
  run (composition: Composition) {
    const { items } = composition;
    const { cardIdList, uselessCardIdList } = this.options;

    cardIdList.map(name => {
      const index = items.findIndex(item => item.name === name);

      if (index < 0) {
        throw new Error('DataError: node name can not match cardIdList, check json or cardIdList.');
      } else {
        const cardItem = items[index];
        const cardName = cardItem.name;

        // 未计算好位置之前先隐藏元素
        cardItem.translate(100, 0, 0);

        if (!(uselessCardIdList && uselessCardIdList.includes(cardName))) {
          this.cardItems.push(cardItem);
        }
      }
    });

    this.checkItemContent();
    this.cardCount = this.cardItems.length;
    this.totalDegree = (this.cardCount - 1) * this.degree;
    this.currentCardIndex = math.clamp(this.currentCardIndex, 0, this.cardCount - 1);

    const transformList = this.getTransform();

    this.updateTransform(transformList);
    this.bindDragEvent();
  }

  /**
   * 移动到指定 index 对应的 卡片
   * @param index - 范围 [0, card.length - 1]
   */
  gotoCardIndex (index: number) {
    if (index < 0 || index > this.cardCount - 1) {
      console.error(`goCardError: Card index out of range, must in [0, ${this.cardCount - 1}].`);

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
      const newIndex =
        this.currentCardIndex + addCount < 0
          ? 0
          : (addCount + this.currentCardIndex > this.cardCount - 1
            ? this.cardCount - 1
            : addCount + this.currentCardIndex);
      const totalDegree = degree + toDegree(this.currentRotate);
      const totalRotate = toRotate(totalDegree);
      const beginTime = time;
      const playedPercent = this.draggedRotate / totalRotate;
      const x = getValOnCubicBezier({ y: playedPercent, cubicBezier }) ?? 0;
      const duration = this.swipeTime;

      this.increaseCurrentPlayId();
      this.playRotate({
        time: beginTime,
        beginTime: beginTime - (x * duration >> 0),
        startRotate: 0,
        duration,
        totalRotate,
        newIndex,
        currentPlayId: this.currentPlayId,
      });
    });
  }

  /**
   * 检查 json 是否缺少元素
   */
  private checkItemContent () {
    for (let i = 0; i < this.cardItems.length; i++) {
      const item = this.cardItems[i];

      if (item.components.length === 0) {
        this.player.dispose();
        throw new Error('DataError: item.content error.');
      }
    }
  }

  private getTransform (startRotate = 0) {
    const transforms = [];

    for (let i = -this.currentCardIndex; i < this.cardCount - this.currentCardIndex; i++) {
      const degree = this.degree * i;
      const rotate = toRotate(degree) + startRotate;
      const x = this.radius * Math.sin(rotate);
      // 防止穿帮
      const z = Math.abs(rotate) > Math.PI / 2 ? 10 : 0;
      const scale = Math.cos(rotate);

      transforms.push({
        scale,
        x,
        z,
      });
    }

    return transforms;
  }

  private updateTransform (transformList: ReturnType<typeof this.getTransform>) {
    if (!this.cardCount) {
      console.error('this.cardItems is empty, ignore.');

      return;
    }

    for (let i = 0; i < this.cardCount; i++) {
      const item = this.cardItems[i];

      if (item.components.length === 0) {
        console.error('Components not found, ignore.');

        return;
      } else {
        item.setVisible(true);
      }
    }

    for (let i = -this.currentCardIndex; i <= this.cardCount - this.currentCardIndex - 1; i++) {
      const index = this.currentCardIndex + i;
      const transform = transformList[index];
      const item = this.cardItems[index];

      item.setPosition(transform.x, 0, transform.z);
      item.setScale(transform.scale, transform.scale, 1);
      item.setVisible(true);
    }
  }

  private bindDragEvent () {
    const handleDragStart = () => {
      // 点击文字后正在滚动
      if (this.playingClick) {
        return;
      }
      this.stopCurrentPlay();

      this.beginX = this.prevX = null;
      this.draggedRotate = this.currentRotate;
      this.maxDragRotate = [
        toRotate(this.currentCardIndex * this.degree - this.currentRotate),
        toRotate((this.cardCount - this.currentCardIndex - 1) * this.degree + this.currentRotate),
      ];
      this.removeEventListener();
      this.addEventListener();
    };

    this.container?.addEventListener('touchstart', handleDragStart);
    this.container?.addEventListener('mousedown', handleDragStart);
  }

  private addEventListener () {
    this.container?.addEventListener('touchmove', this.handleDragMove);
    this.container?.addEventListener('mousemove', this.handleDragMove);
    this.container?.addEventListener('touchend', this.handleDragEnd);
    this.container?.addEventListener('touchcancel', this.handleDragEnd);
    window.addEventListener('mouseup', this.handleDragEnd, true);
  }

  private removeEventListener () {
    this.container?.removeEventListener('touchmove', this.handleDragMove);
    this.container?.removeEventListener('mousemove', this.handleDragMove);
    this.container?.removeEventListener('touchend', this.handleDragEnd);
    this.container?.removeEventListener('touchcancel', this.handleDragEnd);
    window.removeEventListener('mouseup', this.handleDragEnd, true);
  }

  private handleDragMove = (event: TouchEvent | MouseEvent) => {
    let clientX = (event as MouseEvent).clientX;

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

    if (draggedRotate >= this.maxDragRotate[0] || draggedRotate <= -this.maxDragRotate[1]) {
      rotate = 0;
    }
    this.currentRotate += rotate;
    this.draggedRotate += rotate;

    const transformList = this.getTransform(this.currentRotate);

    this.updateTransform(transformList);
    const currenTotalDegree = this.currentCardIndex * this.degree - toDegree(this.currentRotate);

    this.options.onProgress?.(currenTotalDegree / this.totalDegree);
    this.prevX = clientX;
  };

  private handleDragEnd = () => {
    this.removeEventListener();
    if (this.draggedRotate) {
      this.playingDrag = true;
      // 角度过小，不需要转到下一张卡片
      const back = Math.abs(this.draggedRotate) < toRotate(this.degree / 5);

      this.playSwipe(back);
    }
  };

  private playSwipe (back = false) {
    // 用户拖动的距离
    const draggedDegree = toDegree(this.draggedRotate);
    // 应当改变的卡片数
    const addCount = back ? 0 : Math.ceil(Math.abs(draggedDegree) / this.degree) * Math.sign(draggedDegree);
    // 新的卡片 index
    const newIndex =
      this.currentCardIndex - addCount < 0
        ? 0
        : (this.currentCardIndex - addCount > this.cardCount - 1
          ? this.cardCount - 1
          : this.currentCardIndex - addCount);
    // 开始转动的角度
    const startRotate = this.currentRotate;

    this.stopCurrentPlay();

    if (back) {
      window.requestAnimationFrame(time => {
        const beginTime = time;
        const totalDegree = draggedDegree % this.degree * -1;
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
          beginTime: time - (x * duration >> 0),
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
    const { currentPlayId, time, beginTime, startRotate, duration, totalRotate, newIndex } = options;
    const stopPlay = this.playCanceled[+currentPlayId];
    let percent = Math.min(1, (+time - +beginTime) / +duration);

    if (stopPlay) {
      return;
    }

    percent = swipeEasing(percent);
    this.currentRotate = +startRotate + percent * +totalRotate;
    const transformList = this.getTransform(this.currentRotate);

    this.updateTransform(transformList);
    const currenTotalDegree = this.currentCardIndex * this.degree - toDegree(this.currentRotate);

    this.options.onProgress?.(currenTotalDegree / this.totalDegree);

    if (percent < 1) {
      window.requestAnimationFrame(time => {
        this.playRotate({ ...options, time });
      });
    } else {
      this.currentCardIndex = +newIndex;
      this.currentRotate = 0;
      this.options.onGotoCard?.(this.currentCardIndex);
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

  /**
   *
   * @param disposePlayer
   */
  dispose (disposePlayer = true): void {
    if (disposePlayer) {
      this.player?.dispose();
    }
  }
}
