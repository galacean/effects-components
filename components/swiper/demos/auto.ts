import { Player } from '@galacean/effects';
import '@galacean/effects-plugin-spine';
import { SwiperPlugin, assertExist } from '@galacean/effects-components';

const container = document.getElementById('J-container')!;
const url = 'https://mdn.alipayobjects.com/mars/afts/file/A*npprQL993nUAAAAARoAAAAgAelB4AQ';

/**
 * 自动创建轮播案例
 */
(async () => {
  try {
    // 初始化 Player
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });

    // 在loadScene前设置自动创建标志为true，并传递player
    SwiperPlugin.autoCreateSwiper = true;
    SwiperPlugin.getPlayer = () => player;
    await player.loadScene(url);
    const swiperManager = SwiperPlugin.swiperManagers[0];
    const swiper = swiperManager.getSwiper();

    assertExist(swiper);

    // 更多回调，可点击handers进去查看SwiperHandlers的定义
    swiperManager.handlers = {
      onWillGotoSlide (index) {
        console.info('swiper goto index', index);
      },
      onSlidePark (index) {
        console.info('swiper slide park index', index);
      },
    };

    // 跳页
    setTimeout(() => {
      void swiper.gotoSlideIndex(2);
    }, 2000);

  } catch (e) {
    console.error('biz', e);
  }
})();
