import type { SwiperControllerProps } from './types';
import { clamp, formatNum, toDegree, toRotate } from './utils';
import type { Composition } from '@galacean/effects';
export class SwiperController {
  /**
   * 卡片数组
   */
  private readonly cardItems: Composition[] = [];
  cardCount = 5;
  //  卡片之间的距离
  private distance;
  // 卡片全部隐藏 / 按规则可见
  private visible = true;
  // 是否自动隐藏卡片，默认情况下超出屏幕范围的卡片会被隐藏
  private autoHide ;

  onTransform: (compList: Composition[]) => void = () => {};

  constructor (SwiperControllerProps: SwiperControllerProps) {
    const {
      distance = 10,
      autoHide = true,
      cardCount = 0,
      onTransform = () => {},
    } = SwiperControllerProps;

    this.distance = distance;
    this.autoHide = autoHide;
    this.cardCount = cardCount;
    this.onTransform = onTransform;
  }

  setCardCount (count: number) {
    this.cardCount = count;
  }

  setVisible (visible: boolean) {
    this.visible = visible;
    this.handleVisible();
  }

  getItems () {
    return this.cardItems;
  }
  /**
   * 执行合成轮播
   * @param {Composition[]} compList
   * @param initCardIndex
   */
  run (compList: Composition[], initCardIndex: number) {
    this.cardCount = compList.length;
    for (let i = 0; i < compList.length; i++) {
      this.cardItems[i] = compList[i];
    }
    const index = clamp(initCardIndex, 0, this.cardCount - 1);

    this.updateTransform(index / (this.cardCount - 1));
  }

  handleVisible () {
    this.cardItems.forEach(comp => {
      if (!comp || comp.isDestroyed || comp.getPaused()) {
        return;
      }
      if (!this.visible) {
        comp.setVisible(false);

        return;
      }
      if (this.autoHide) {
        // 超出屏幕的合成隐藏
        const { x } = comp.camera.getInverseVPRatio(0);

        if (
          Math.abs(comp.transform.position.x) > 2 * x &&
          !comp.getPaused()
        ) {
          comp.setVisible(false);
        } else {
          comp.setVisible(true);
        }
      }
    });
  }

  updateCompByIndex (index: number, newComp: Composition) {
    const oldComp = this.cardItems[index];

    if (!oldComp) {
      this.cardItems[index] = newComp;

      return;
    }
    this.cardItems[index] = newComp;
    const pos = oldComp.transform.position.clone();

    oldComp.dispose();
    newComp.setPosition(pos.x, 0, 0);
  }

  getTransformByProgress (progress: number) {
    const res = new Array(this.cardCount).fill(0);

    for (let i = 0; i < this.cardCount; i++) {
      const x = formatNum(this.distance * i - progress * (this.cardCount - 1) * this.distance, 3);

      res[i] = x;
    }

    return res;
  }

  updateTransform (progress: number) {
    const transformList = this.getTransformByProgress(progress);

    for (let i = 0; i < transformList.length; i++) {
      const x = transformList[i];
      const comp = this.cardItems[i];

      if (!comp) {
        return;
      }
      comp.setPosition(x, 0, 0);
    }
    this.onTransform(this.cardItems);
    this.handleVisible();
  }
}
