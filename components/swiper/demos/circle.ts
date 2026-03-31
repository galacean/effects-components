import { Player } from '@galacean/effects';
import { CircleRotateController, SwiperManager } from '@galacean/effects-components';

const container = document.getElementById('J-container')!;

const mainJSON =
  'https://mdn.alipayobjects.com/mars/afts/file/A*aM5ESoLpDsMAAAAAQYAAAAgAelB4AQ';

(async () => {
  try {
    // 初始化 Player
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });

    const initSlideIndex = 0;
    // 加载合成，可以先只加载主场景和初始幻灯片
    const composition = await player.loadScene(mainJSON);

    CircleRotateController.slideRotateAngle = 0;

    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      composition: composition,
      slideCompositions: [],
      player: player,
      options: {
        initSlideIndex,
        swipeEasing: [0.1, 0.1, 0.9, 0.9],
        // radius: 30,
      },
      handlers: {
        onWillGotoSlide: index => {
          console.info('onWillGotoSlide', index);
        },
      },
    });

    // 准备就绪，创建轮播（如果检测到没有幻灯片，会返回null，比如new SwiperManager没有传slideCompositions且setupLoading没有指定幻灯片数量）
    const swiper = swiperManager.createSwiper();

    // 初始化导航点击
    const swiperNav = document.querySelector('.swiper-nav');

    swiperNav?.addEventListener('click', e => {
      const target = (e.target as HTMLElement).closest('button');

      if (target) {
        const slideIndex = Number(target.dataset.index) - 1;

        void swiper?.gotoSlideIndex(slideIndex);
      }
    });

  } catch (e) {
    console.error(e);
  }
})();
