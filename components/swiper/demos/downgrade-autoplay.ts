import type { Swiper, SwiperData } from '@galacean/effects-components';
import { SwiperManager } from '@galacean/effects-components';
import sliderConfig from './json/slider-config.json';

// 水平裁剪（即按高度适配，高度越大，距离越大；高度固定，则高度大小固定）
const cameraOptions = {
  fov: 60,
  far: 40,
  near: 0.1,
  clipMode: 0,
  position: [0, 0, 16],
  rotation: [0, 0, 0],
};

(async () => {
  try {
    const initSlideIndex = 2; // 从0开始
    let swiper: Swiper | null = null;
    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      downgrade: true, // 启动降级
      downgradeSwiperElement: document.getElementById('J-downgrade-swiper') as HTMLElement, // 降级的DOM容器
      downgradeSlideSelector: '.downgrade-slide', // 降级幻灯片的CSS选择器
      // 更多参数可以点进去看SwiperData的定义
      options: {
        // @ts-expect-error
        ...(sliderConfig.sliders[0].data as Partial<SwiperData>),
        initSlideIndex,
        loop: true, // 幻灯片循环摆放
        slideDistance: 15, // 幻灯片间距
      },
      cameraOptions, // 默认是垂直裁剪（按宽度适配，此处改为按高度适配，以适配折叠屏）
      animationList: sliderConfig.animations,
      handlers: {
        onSlideClick (clickIndex, itemNames) {
          console.info('clickIndex', clickIndex, 'itemNames', itemNames);
        },
        onSlidePark (index) {
        },
        getCanvasBounding () {
          return document.body.getBoundingClientRect();
        },
      },
    });

    swiper = swiperManager.createSwiper();
    if (swiper) {
      // 进场后自转一圈
      const playSlideCount = 5; // 播放的幻灯片数量
      const playDuration = 2000; // 播放时长，单位毫秒
      const beginSlideIndex = initSlideIndex; // 播放的起始幻灯片索引

      swiper.currentDirection = 1; // 播放方向，1为向右，-1为向左
      void swiper.fastPlay(playSlideCount, { playDuration, beginSlideIndex });
    }
  } catch (e) {
    console.error(e);
  }
})();
