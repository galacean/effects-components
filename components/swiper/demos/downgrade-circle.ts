import { SwiperManager } from '@galacean/effects-components';
import circleConfig from './circle-config.json';

(async () => {
  try {
    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      options: circleConfig as any,
      downgrade: true,
      downgradeSwiperElement: document.getElementById('J-downgrade-swiper') as HTMLElement,
      downgradeSlideSelector: '.downgrade-slide',
    });

    const swiper = swiperManager.createSwiper();

    // @ts-expect-error
    window.swiper = swiper;

  } catch (e) {
    console.error(e);
  }
})();
