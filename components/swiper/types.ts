import type { Composition } from '@galacean/effects';

export type SwiperOptions = {
  onGotoCard: (currentCardIndex: number) => unknown,
  /**
   * 半径
   */
  radius?: number,
  /**
   * 卡片的间隔角度，影响缩放比例
   */
  degree?: number,
  /**
   * 卡片数量
   */
  cardCount: number,
  /**
   * 滑动时间
   */
  swipeTime?: number,
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
  onProgress?: (progress: number, currentCardIndex: number) => void,
  /**
   * 转动到 cardIndex 对应卡片时的回调
   * @param {number} cardIndex
   */
  onDragMove?: (cardIndex: number, rotate: number) => void,
};

export type SwiperControllerProps = {
  /**
   * 超出屏幕的合成是否自动隐藏
   */
  autoHide?: boolean,
  /**
   * 合成间的距离
   */
  distance?: number,
  /**
   * 合成数量
   */
  cardCount?: number,
  /**
   * 每次位移后的回调
   * @param {Composition[]} compList
   */
  onTransform?: (compList: Composition[]) => void,
};
