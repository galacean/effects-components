import { SwiperController } from './swiper-controller';
import { swiperControllerMap } from './swiper-controller-map';
import { EffectTemplate } from '../data/swiper-data';

export class ArcRotateController extends SwiperController {
  static override effectType = EffectTemplate.arc;

  getTransformByProgress ({ progressInSlide }: { progressInSlide: number }) {
    const perspective = -(this.options.perspective ?? 0);
    const { slideDistance } = this.options;
    const positions: [number, number, number][] = [];
    const rotations: [number, number, number][] = [];

    const slideIndexList = [];
    const { slideCount } = this.swiper;
    const currentIndex = this.swiper.getCurrentIndex();
    let currentSlideInListIndex = currentIndex;

    if (this.options.loop) {
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
      const slideIndex = this.options.loop ? slideIndexList[i] : i;
      const degree = (i - currentSlideInListIndex) * slideDistance + progressInSlide * slideDistance;
      const rotate = this.toRotate(degree);
      const z = this.options.radius * (1 - Math.cos(rotate)) + perspective;
      const x = this.options.radius * Math.sin(rotate);

      positions[slideIndex] = [x, 0, z];
      rotations[slideIndex] = [0, this.toDegree(rotate), 0];
    }

    return { positions, rotations };
  }

  override getDistance (distance: number) {
    return this.toDegree(Math.sin(distance / this.options.radius));
  }

}

swiperControllerMap[ArcRotateController.effectType] = ArcRotateController;
