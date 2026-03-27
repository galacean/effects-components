import type { VFXItem as PlayerVFXItem } from '@galacean/effects';
import { SwiperController } from './swiper-controller';
import { swiperControllerMap } from './swiper-controller-map';
import { EffectTemplate, type SwiperData } from '../data/swiper-data';
import { SlideController } from './circle-rotate/slide-controller';
import type { Swiper } from '../swiper';
import { sortChildrenByZ, SwiperItemSorter } from './circle-rotate/slide-sorter';
import { assertExist } from '../common/utils';
import { bezier as BezierEasing } from '../animate/bezier-easing';

export class CircleRotateController extends SwiperController {
  static override effectType = EffectTemplate.circle;
  centerItem?: PlayerVFXItem;
  centerElement?: HTMLElement;
  slideControllers: SlideController[] = [];
  onUpdateDisposer: (() => void) | null = null;
  static neighborDistance = 0.3;
  // 居中卡片摆正的旋转四元素;
  slideQuaternions = [
    [0.16865, 0, 0, -0.985675],
  ];
  easeOut = BezierEasing(.59, 0, 1, .45);
  cardParkRotationRatio: number[] = [];
  static cardRotateAngle = 0;
  distance = 0;
  diffFromStart = 0;
  currentDirection = 1;
  prevSlideOutProgress = 0;

  constructor (options: SwiperData, swiper: Swiper) {
    super(options, swiper);
  }

  initParkRatio () {
    const { neighborDistance } = CircleRotateController;

    this.cardParkRotationRatio.push(0, neighborDistance);
    const leftPiece = (1 - neighborDistance * 2) / (this.cardCount - 2);
    let distance = neighborDistance;

    for (let i = 2; i < this.cardCount; i++) {
      distance += leftPiece;
      this.cardParkRotationRatio.push(distance);
    }
    this.cardParkRotationRatio.push(1);
  }

  override init () {
    this.initParkRatio();
    this.getCenterItem();
    this.setUpSlide();
    this.onSlidePark(this.options.initCardIndex);
  }

  override onPlayerTick () {
    if (this.centerItem) {
      sortChildrenByZ(this.centerItem);
    }
  }

  getCenterItem () {
    if (!this.swiper.downgrade) {
      assertExist(this.swiper.composition, 'getCenterItem this.swiper.composition');
      this.swiper.composition.rootItem.addComponent(SwiperItemSorter);
    } else {
      const centerElement = this.swiper.target.querySelector('.downgrade-center-item') as HTMLElement;

      assertExist(centerElement, 'getCenterItem centerElement');
      this.centerElement = centerElement;
    }
  }

  setUpSlide () {
    this.slideControllers = this.cardItems.map((item, index) => {
      const centerItem = item.parent;
      const videoUrl = '';
      const slideController = new SlideController(item, centerItem, index, this.cardCount, videoUrl, this.swiper.composition!, this.options, CircleRotateController.cardRotateAngle, this.cardParkRotationRatio);

      slideController.init();

      return slideController;
    });
  }

  override onSlideOut (cardIndex: number, progress: number, { speed, leftCount, canCallReverse = true, isDrag }: { speed?: number, canCallReverse?: boolean, leftCount?: number, isDrag?: boolean } = {}) {
    super.onSlideOut(cardIndex, progress, { speed, leftCount, isDrag });

    if (this.swiper.downgrade) {
      return;
    }
    const easingProgress = this.easeOut.easing(1 - progress);
    const controller = this.slideControllers[cardIndex];

    void controller.fromRotateToAlign(easingProgress, this.slideQuaternions[0]);
  }

  override onSlideIn (cardIndex: number, progress: number, { speed, leftCount, canCallReverse = true, isDrag }: { speed?: number, canCallReverse?: boolean, leftCount?: number, isDrag?: boolean } = {}) {
    super.onSlideIn(cardIndex, progress, { speed, leftCount, isDrag });
    if (this.swiper.downgrade) {
      return;
    }
    const easingProgress = this.easeOut.easing(progress);
    // 滑走摆正还原成倾斜
    const controller = this.slideControllers[cardIndex];

    void controller.fromRotateToAlign(easingProgress, this.slideQuaternions[0]);
  }

  override onDragSwap () {
    super.onDragSwap();
    this.currentDirection *= -1;
  }

  override onSlidePark (cardIndex: number) {
    super.onSlidePark(cardIndex);
    if (this.swiper.downgrade) {
      return;
    }
    this.currentDirection = 1;
    this.prevSlideOutProgress = 0;
    const currentIndex = this.swiper.getCurrentIndex();

    this.fixSlideRotation([currentIndex]);
    void this.slideControllers[currentIndex].fromRotateToAlign(1, this.slideQuaternions[0]);
  }

  override onDragDirectionReverse () {
    this.currentDirection *= -1;
  }

  override onProgress (progress: number, data: {
    speed?: number,
    dragDirection: number,
    totalDirection: number,
    progressInSlide: number,
  }) {
    super.onProgress(progress, data);
    const { totalDirection } = data;
    const currentIndex = this.swiper.getCurrentIndex();
    const progressSlides = [currentIndex, totalDirection > 0 ? this.swiper.getNextIndex() : this.swiper.getPrevIndex()];

    this.fixSlideRotation(progressSlides);
  }

  fixSlideRotation (progressSlides: number[]) {
    if (this.swiper.downgrade) {
      return;
    }
    for (let i = 0; i < this.cardCount; i++) {
      if (!progressSlides.includes(i)) {
        void this.slideControllers[i].fromRotateToAlign(0, this.slideQuaternions[0]);
      }
    }
  }

  getTransformByProgress ({ progressInSlide, progressInTotal, speed }: { progressInSlide: number, progressInTotal: number, speed?: number }) {
    if (!this.swiper.downgrade) {
      this.slideControllers.forEach(controller => {
        controller.updateCenterRotation(progressInSlide, progressInTotal, speed);
      });
    } else {
      assertExist(this.centerElement, 'getTransformByProgress this.centerElement');
      const rotateX = this.centerElement.style.transform.match(/rotateX\((-?\d+)deg\)/)?.[1] ?? '0';

      this.centerElement.style.transform = ` rotateX(${rotateX}deg) rotateY(${360 * (1 - progressInTotal)}deg) rotateZ(${0}deg)`;
    }

    return { positions: [] };
  }

  override dispose () {
    this.onUpdateDisposer?.();
  }

  override getDistanceZ () {
    return this.options.radius;
  }

  override getDistance (distance: number, diffFromStart: number): number {
    this.distance = distance;
    this.diffFromStart = diffFromStart;

    return distance * 0.13 + Math.abs(diffFromStart * distance) * Math.sign(distance) * 0.002;
  }

  override willPlayBack (progressInCard: number): boolean | void {
    return Math.abs(progressInCard) < this.options.playBackRatio;
  }
}

swiperControllerMap[CircleRotateController.effectType] = CircleRotateController;
