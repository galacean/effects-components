import { SwiperController } from './swiper-controller';
import { swiperControllerMap } from './swiper-controller-map';
import { EffectTemplate } from '../data/swiper-data';

export class HorizontalController extends SwiperController {
  static override effectType = EffectTemplate.horizontal;
  getTransformByProgress ({ progressInSlide }: { progressInSlide: number }) {
    const { slideDistance, loop } = this.options;
    const positions = Array.from({ length: this.cardCount }, () => [0, 0, 0] as [number, number, number]);
    const cardIndexList = [];
    const { cardCount } = this.swiper;
    const currentIndex = this.swiper.getCurrentIndex();
    let currentCardInListIndex = currentIndex;

    if (loop) {
      const half = Math.floor(cardCount / 2);
      const adjustLeft = cardCount % 2 === 0 ? 1 : 0; // 卡片是偶数情况下，让右边多摆一个卡片

      for (let i = 0; i < this.cardCount; i++) {
        const index = (currentIndex - half + i + cardCount + adjustLeft) % cardCount;

        cardIndexList.push(index);
        if (index === currentIndex) {
          currentCardInListIndex = i;
        }
      }
    } else {
      cardIndexList.push(...Array.from({ length: this.cardCount }, (_, i) => i));
    }

    for (let i = 0; i < this.cardCount; i++) {
      const cardIndex = cardIndexList[i];

      positions[cardIndex][0] = (i - currentCardInListIndex) * slideDistance + progressInSlide * slideDistance;
    }

    this.cardIndexList = cardIndexList;

    return { positions };
  }
}

swiperControllerMap[HorizontalController.effectType] = HorizontalController;
