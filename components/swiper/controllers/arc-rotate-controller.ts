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

    const cardIndexList = [];
    const { cardCount } = this.swiper;
    const currentIndex = this.swiper.getCurrentIndex();
    let currentCardInListIndex = currentIndex;

    if (this.options.loop) {
      const half = Math.floor(cardCount / 2);
      const adjustLeft = cardCount % 2 === 0 ? 1 : 0; // 卡片是偶数情况下，让右边多摆一个卡片

      for (let i = 0; i < this.cardCount; i++) {
        const index = (currentIndex - half + i + cardCount + adjustLeft) % cardCount;

        cardIndexList.push(index);
        if (index === currentIndex) {
          currentCardInListIndex = i;
        }
      }
    }

    for (let i = 0; i < this.cardCount; i++) {
      const cardIndex = this.options.loop ? cardIndexList[i] : i;
      const degree = (i - currentCardInListIndex) * slideDistance + progressInSlide * slideDistance;
      const rotate = this.toRotate(degree);
      const z = this.options.radius * (1 - Math.cos(rotate)) + perspective;
      const x = this.options.radius * Math.sin(rotate);

      positions[cardIndex] = [x, 0, z];
      rotations[cardIndex] = [0, this.toDegree(rotate), 0];
    }

    return { positions, rotations };
  }

  override getDistance (distance: number) {
    return this.toDegree(Math.sin(distance / this.options.radius));
  }

}

swiperControllerMap[ArcRotateController.effectType] = ArcRotateController;
