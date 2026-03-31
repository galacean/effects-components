import { SwiperController } from './swiper-controller';
import { swiperControllerMap } from './swiper-controller-map';
import { EffectTemplate } from '../data/swiper-data';

export class CircleFrontController extends SwiperController {
  static override effectType = EffectTemplate.circleFront;

  getPosition (progress: number) {
    const { radius } = this.options;
    const positions: [number, number, number][] = [];

    // 摆放成一个圆圈
    for (let i = 0; i < this.slideCount; i++) {
      const slideIndex = i;

      const initRotationY = (360 - (slideIndex * 360) / this.swiper.slideCount + 90) + progress * 360;
      const d = radius + slideIndex * 0.1;
      const x = d * Math.cos((Math.PI * 2 * initRotationY) / 360);
      const z = d * Math.sin((Math.PI * 2 * initRotationY) / 360);

      positions.push([x, 0, z]);
    }

    return positions;
  }

  getTransformByProgress ({ progressInTotal }: { progressInTotal: number }) {
    return {
      positions: this.getPosition(progressInTotal),
    };
  }

  override getDistance (distance: number) {
    return Math.sin(distance / this.options.radius) * 1.5;
  }

}

swiperControllerMap[CircleFrontController.effectType] = CircleFrontController;
