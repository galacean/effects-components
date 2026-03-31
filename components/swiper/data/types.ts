import type { Texture } from '@galacean/effects';

export type SwiperHandlers = {
  /**
   * 转动到 slideIndex 对应卡片时的回调，手松开时触发，或者调gotoSlideIndex时触发
   * @param slideIndex
   */
  onWillGotoSlide?: (slideIndex: number, data: { isFastDrag: boolean, isGoto: boolean }) => void,
  /**
   * 当前角度在总角度中的占比，0 表示在最左侧，1 表示在最右侧
   * @param progress
   * @param data dragDirection 表示滑动方向：1为向右，-1为向左。speed 表示滑动速度，快速滑动触发时有值。totalDirection表示当前整体在当前卡片的右边或左边，1为右边，-1为左边
   */
  onProgress?: (progress: number, data: { speed?: number, dragDirection: number, totalDirection: number, progressInSlide: number }) => void,
  /**
   * 转动到 slideIndex 对应卡片时的回调
   * @param slideIndex
   * @param rotate
   */
  onSlidePark?: (slideIndex: number, data: { addSlideCount: number }) => void,
  /**
   * 卡片滑入到中间的过程的回调
   * @param slideIndex
   * @param progress
   * @param data
   */
  onSlideIn?: (slideIndex: number, progress: number, data: { speed?: number, leftCount?: number, isDrag?: boolean, side: 'left' | 'right' }) => void,
  /**
   * 卡片从中间滑出的过程的回调
   * @param slideIndex
   * @param progress
   * @param data
   */
  onSlideOut?: (slideIndex: number, progress: number, data: { speed?: number, leftCount?: number, isDrag?: boolean, side: 'left' | 'right' }) => void,
  /**
   * 当前待机的卡片索引列表（当前非滑入、居中的卡片）
   * @param slideIndexList
   */
  onSlidesIdle?: (slideIndexList: number[]) => void,
  /**
   * 点击回调（注意，需要在合成中添加交互元素方能生效）
   */
  onSlideClick?: (slideIndex: number, itemNames: string[]) => void,
  /**
   * 自定义获取画布包围盒（默认是调用canvas.getBoundingClientRect()）
   */
  getCanvasBounding?: () => DOMRect,
  /**
   * 是否禁止拖拽（只允许gotoSlideIndex控制）
   */
  getDisableDrag?: () => boolean,
  onEnterAnimationEnd?: () => void,
};

export interface Type<T> extends Function { new (...args: any[]): T }

export type TextureData = {
  type: 'video' | 'image',
  url: string,
  itemName: string,
  uniformName?: string,
  index: number,
  component?: any,
  texture?: Texture,
  videoSource?: {
    h264: string,
    h265: string,
    downgradeImgUrl?: string,
  },
  loadingImg?: string,
};
