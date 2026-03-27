import { SwiperController } from './swiper-controller';
import { swiperControllerMap } from './swiper-controller-map';
import { EffectTemplate } from '../data/swiper-data';

export class VerticalController extends SwiperController {
  static override effectType = EffectTemplate.vertical;
  override direction = 'vertical' as const;
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
    }

    for (let i = 0; i < this.cardCount; i++) {
      const cardIndex = loop ? cardIndexList[i] : i;

      positions[cardIndex][1] = (i - currentCardInListIndex) * slideDistance + progressInSlide * slideDistance;
    }

    return { positions };
  }

  override chooseXY () {
    return 1; // 'y'
  }

}

swiperControllerMap[VerticalController.effectType] = VerticalController;
