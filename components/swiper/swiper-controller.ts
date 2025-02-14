import type { Composition } from '@galacean/effects';
import { math } from '@galacean/effects';
import type { SwiperControllerOptions } from './types';
import { formatNum } from './utils';

/**
 *
 */
export class SwiperController {
  /**
   * 卡片总数
   * @internal
   */
  cardCount = 0;
  /**
   * 卡片数组
   */
  private readonly cardItems: Composition[] = [];
  /**
   * 卡片之间的距离
   */
  private distance;
  /**
   * 卡片全部隐藏/按规则可见
   */
  private visible = true;
  /**
   * 是否自动隐藏卡片，默认情况下超出屏幕范围的卡片会被隐藏
   */
  private autoHide;

  /**
   *
   */
  onTransform: (compositions: Composition[]) => void = () => { };

  /**
   *
   * @param options
   */
  constructor (options: SwiperControllerOptions) {
    const {
      distance = 10,
      autoHide = true,
      onTransform = () => { },
    } = options;

    this.distance = distance;
    this.autoHide = autoHide;
    this.onTransform = onTransform;
  }

  /**
   *
   * @param count
   */
  setCardCount (count: number) {
    this.cardCount = count;
  }

  /**
   *
   * @param visible
   */
  setVisible (visible: boolean) {
    this.visible = visible;
    this.handleVisible();
  }

  /**
   *
   * @returns
   */
  getItems () {
    return this.cardItems;
  }

  /**
   * 执行合成轮播
   * @param compositions
   * @param initCardIndex
   */
  run (compositions: Composition[], initCardIndex: number) {
    for (let i = 0; i < compositions.length; i++) {
      this.cardItems[i] = compositions[i];
    }

    const index = math.clamp(initCardIndex, 0, this.cardCount - 1);

    this.updateTransform(index / (this.cardCount - 1));
  }

  /**
   *
   * @param progress
   * @returns
   */
  updateTransform (progress: number) {
    const transformList = this.getTransformByProgress(progress);

    for (let i = 0; i < transformList.length; i++) {
      const x = transformList[i];
      const composition = this.cardItems[i];

      if (!composition) {
        return;
      }
      composition.setPosition(x, 0, 0);
    }
    this.onTransform(this.cardItems);
    this.handleVisible();
  }

  /**
   *
   * @param index
   * @param newComposition
   * @returns
   */
  updateCompByIndex (index: number, newComposition: Composition) {
    const oldComposition = this.cardItems[index];

    if (!oldComposition) {
      this.cardItems[index] = newComposition;

      return;
    }

    this.cardItems[index] = newComposition;

    const pos = oldComposition.transform.position.clone();

    oldComposition.dispose();
    newComposition.setPosition(pos.x, 0, 0);
  }

  private handleVisible () {
    this.cardItems.forEach(composition => {
      if (!composition || composition.isDestroyed || composition.getPaused()) {
        return;
      }

      if (!this.visible) {
        composition.setVisible(false);

        return;
      }
      if (this.autoHide) {
        // 超出屏幕的合成隐藏
        const { x } = composition.camera.getInverseVPRatio(0);

        if (
          Math.abs(composition.transform.position.x) > 2 * x &&
          !composition.getPaused()
        ) {
          composition.setVisible(false);
        } else {
          composition.setVisible(true);
        }
      }
    });
  }

  private getTransformByProgress (progress: number) {
    const result = new Array(this.cardCount).fill(0);

    for (let i = 0; i < this.cardCount; i++) {
      const x = formatNum(this.distance * i - progress * (this.cardCount - 1) * this.distance, 3);

      result[i] = x;
    }

    return result;
  }
}
