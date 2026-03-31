import { spec as SPEC } from '@galacean/effects';

export const swiperDataVersion = '0.0.1';

type SlideData = {
  controlItemId: string, // 轮播卡片的窗口节点，通常为空节点或预合成元素
} & CompositionSlideData;

export type CompositionSlideData = {
  slideInSplit?: boolean, // 是否区分左右侧滑入动画
  slideInAnimation?: string, // 滑入动画资源id
  slideInAnimationLeft?: string, // 左侧滑入动画资源id
  slideInAnimationRight?: string, // 右侧滑入动画资源id
  centerAnimation?: string, // 居中动画资源id
  centerAnimationLoop?: boolean, // 居中动画是否循环
  idleSplit?: boolean, // 是否区分左右侧空闲动画
  idleAnimation?: string, // 空闲动画资源id
  idleAnimationLeft?: string, // 左侧空闲动画资源id
  idleAnimationRight?: string, // 右侧空闲动画资源id  enterAnimation?: string, // 进场动画资源id
  enterAnimation?: string, // 进场动画资源id
};

export enum EffectTemplate {
  custom = 'custom', // 自定义（开发自行实现）
  horizontal = 'horizontal', // 水平轮播
  vertical = 'vertical', // 垂直轮播
  arc = 'arc', // 旋转轮播
  circle = 'circle', // 圆形轮播
  circleFront = 'circle-front', // 圆形轮播（正面）
}

export type SwiperData = {
  version: string,
  effectTemplate: EffectTemplate, // 效果模板，当前支持平移、竖移及旋转
  slideDistance: number, // 幻灯片间距
  radius: number, // 当效果为旋转时的旋转半径
  perspective: number, // 当效果为旋转时的透视距离，值越大，则看起来越小
  swipeTime: number, // 滑动时间
  swipeEasing: [number, number, number, number], // 滑动的缓动
  startPanThreshold: number, // 滑动开始阈值（避免频繁触发onSlidePark），单位像素
  slides: SlideData[], // 幻灯片控制元素列表
  slideNames: string[], // 幻灯片名称列表，可以调整幻灯片的顺序及仅隐藏部分幻灯片（仅传一个合成时生效）
  initSlideIndex: number, // 初始化定位的卡片索引，从1开始
  centerAnimationLoop: boolean, // 居中动画是否循环
  loop: boolean, // 是否循环
  autoPlay: boolean, // 是否自动播放
  autoPlaySpeed: number, // 自动播放速度
  autoPlayInterval: number, // 自动播放停留间隔
  slideInSplit: boolean, // 是否区分左右侧滑入动画
  slideInAnimation: string, // 滑入动画资源id
  slideInAnimationLeft: string, // 左侧滑入动画资源id
  slideInAnimationRight: string, // 右侧滑入动画资源id
  centerAnimation: string, // 居中动画资源id
  idleSplit: boolean, // 是否区分左右侧空闲动画
  idleAnimation: string, // 空闲动画资源id
  idleAnimationLeft: string, // 左侧空闲动画资源id
  idleAnimationRight: string, // 右侧空闲动画资源id
  playBackRatio: number, // 拖拽松手时，会往回滑动的距离比例比例
  swipeEasingCurve: SPEC.BezierValue, // 滑动的缓动曲线（内部使用）
  slideNumberVarying: boolean, // 卡片数量是否变化
  enableFastDrag: boolean, // 是否开启快速滑动
  fastDragThreshold: number, // 快速滑动阈值
  fastDragAmplitude: number, // 快速滑动幅度
  fastDragEasing: [number, number, number, number], // 快速滑动的缓动
  fastDragEasingCurve: SPEC.BezierValue, // 快速滑动的缓动曲线（内部使用）
  fastDragTimeRatio: number, // 快速滑动时间比例
  autoRenderOrder: boolean, // 是否自动将居中的卡片层级调到最高
  dragStepRatio: number, // 控制拖拽步长的比例
  autoResize: boolean, // 降级时是否自适应容器宽高变化
  enterEnabled: boolean, // 是否开启进场动画
  enterDisableSlideIn: boolean, // 播放进场动画过程中，是否禁用滑入动画
  enterLoopCount: number, // 进场动画循环次数
  enterDuration: number, // 进场动画时长
  enterEasing: [number, number, number, number], // 进场动画缓动
  enterEasingCurve: SPEC.BezierValue, // 进场动画缓动曲线（内部使用）
  enterAnimation: string, // 进场动画资源id
  enterAnimationDelayFrame: number, // 进场动画延迟帧数
  autoPlayEnterAnimation: boolean, // 是否自动播放进场动画，默认true
  centerToSlideOutSplit: number, // 居中动画播放到一半时，切换到滑出动画的过渡时长
  enterToSlideOutSplit: number, // 进场动画播放到一半时，切换到滑出动画的过渡时长

  centerControlItemId?: string, // 中心控制元素（效果模板为圆形时生效）
};

export function getDefaultSwiperData (): SwiperData {
  return {
    version: swiperDataVersion,
    effectTemplate: EffectTemplate.horizontal,
    slideDistance: 7,
    radius: 15,
    perspective: -1,
    swipeTime: 0.3,
    swipeEasing: [0.23, 0.18, 0.14, 1],
    startPanThreshold: 1,
    swipeEasingCurve: [
      SPEC.ValueType.BEZIER_CURVE,
      [
        [SPEC.BezierKeyframeType.EASE_OUT, [0, 0, 0.23, 0.18]],
        [SPEC.BezierKeyframeType.EASE_IN, [0.14, 1, 1, 1]],
      ],
    ],
    slides: [{
      controlItemId: '',
    }],
    initSlideIndex: 0,
    loop: false,
    centerAnimationLoop: true,
    autoPlay: false,
    autoPlaySpeed: 1,
    autoPlayInterval: 3,
    slideInSplit: false,
    slideInAnimation: '',
    slideInAnimationLeft: '',
    slideInAnimationRight: '',
    centerAnimation: '',
    idleSplit: false,
    idleAnimation: '',
    idleAnimationLeft: '',
    idleAnimationRight: '',
    playBackRatio: 0.1,
    slideNumberVarying: false,
    slideNames: [],
    enableFastDrag: false,
    fastDragThreshold: 1,
    fastDragAmplitude: 1,
    fastDragEasing: [0.115, 0, 0.002, 1],
    fastDragEasingCurve:  [
      SPEC.ValueType.BEZIER_CURVE,
      [
        [SPEC.BezierKeyframeType.EASE_OUT, [0, 0, 0.115, 0]],
        [SPEC.BezierKeyframeType.EASE_IN, [0.002, 1, 1, 1]],
      ],
    ],
    fastDragTimeRatio: 1,
    autoRenderOrder: false,
    dragStepRatio: 1,
    autoResize: true,
    enterEnabled: false,
    enterDisableSlideIn: false,
    enterLoopCount: 1,
    enterDuration: 3,
    enterEasing:  [0.115, 0, 0.002, 1],
    enterEasingCurve: [
      SPEC.ValueType.BEZIER_CURVE,
      [
        [SPEC.BezierKeyframeType.EASE_OUT, [0, 0, 0.115, 0]],
        [SPEC.BezierKeyframeType.EASE_IN, [0.002, 1, 1, 1]],
      ],
    ],
    enterAnimation: '',
    enterAnimationDelayFrame: 0,
    autoPlayEnterAnimation: true,
    centerToSlideOutSplit: 0.3,
    enterToSlideOutSplit: 0.2,
  } as SwiperData;
}

export type AnimationType = 'centerAnimation' | 'idleAnimation' | 'slideInAnimation' | 'slideInAnimationLeft' | 'slideInAnimationRight' | 'idleAnimationLeft' | 'idleAnimationRight';
