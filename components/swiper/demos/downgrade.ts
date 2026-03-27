import { SwiperManager } from '@galacean/effects-components';

(async () => {
  try {
    const initCardIndex = 2;
    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      downgrade: true, // 启动降级
      downgradeSwiperElement: document.getElementById('J-downgrade-swiper') as HTMLElement, // 降级的DOM容器
      downgradeSlideSelector: '.downgrade-slide', // 降级幻灯片的CSS选择器
      options: {
        initCardIndex,
      },
    });

    swiperManager.createSwiper();
  } catch (e) {
    console.error(e);
  }
})();
