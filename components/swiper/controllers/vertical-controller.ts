import { SwiperController } from './swiper-controller';
import { swiperControllerMap } from './swiper-controller-map';
import { EffectTemplate } from '../data/swiper-data';

export class VerticalController extends SwiperController {
  static override effectType = EffectTemplate.vertical;
  override direction = 'vertical' as const;
  getTransformByProgress ({ progressInSlide }: { progressInSlide: number }) {
    const { slideDistance, loop } = this.options;
    const positions = Array.from({ length: this.slideCount }, () => [0, 0, 0] as [number, number, number]);
    const slideIndexList = [];
    const { slideCount } = this.swiper;
    const currentIndex = this.swiper.getCurrentIndex();
    let currentSlideInListIndex = currentIndex;

    if (loop) {
      const half = Math.floor(slideCount / 2);
      const adjustLeft = slideCount % 2 === 0 ? 1 : 0; // 卡片是偶数情况下，让右边多摆一个卡片

      for (let i = 0; i < this.slideCount; i++) {
        const index = (currentIndex - half + i + slideCount + adjustLeft) % slideCount;

        slideIndexList.push(index);
        if (index === currentIndex) {
          currentSlideInListIndex = i;
        }
      }
    }

    for (let i = 0; i < this.slideCount; i++) {
      const slideIndex = loop ? slideIndexList[i] : i;

      positions[slideIndex][1] = (i - currentSlideInListIndex) * slideDistance + progressInSlide * slideDistance;
    }

    return { positions };
  }

  override chooseXY () {
    return 1; // 'y'
  }

}

swiperControllerMap[VerticalController.effectType] = VerticalController;
