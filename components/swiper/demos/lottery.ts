import { Player } from '@galacean/effects';
import { assertExist, SwiperManager } from '@galacean/effects-components';
import '@galacean/effects-plugin-spine';

const container = document.getElementById('J-container')!;

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*elINQpOIJR0AAAAAQPAAAAgAelB4AQ';

const slideJSON = [
  'https://mdn.alipayobjects.com/mars/afts/file/A*hhQHS6yU3V8AAAAAQKAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*3B6mQI_1lm0AAAAAQKAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*EDqjQZvUPM8AAAAAQKAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*A0SFR663pj8AAAAAQJAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*0x4SQ4ECdjQAAAAAQJAAAAgAelB4AQ',
];

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
    const compositions = await player.loadScene([mainJSON, ...slideJSON]);

    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      composition: compositions[0],
      slideCompositions: compositions.slice(1).map((comp, index) => ({ composition: comp, index, url: slideJSON[index] })),
      player: player,
      options: {
        initSlideIndex,
        enterDuration: 2,
        enterEasing: [0.115, 0, 0.002, 1],
        enterLoopCount: 2,
      },
      handlers: {
        onWillGotoSlide (index) {
          console.info('onWillGotoSlide', index);
        },
      },
    });

    // 准备就绪，创建轮播（如果检测到没有幻灯片，会返回null，比如new SwiperManager没有传slideCompositions且setupLoading没有指定幻灯片数量）
    const swiper = swiperManager.createSwiper();

    // @ts-expect-error
    window.swiper = swiper;

    assertExist(swiper);
    initButtonClick(swiperManager);
  } catch (e) {
    console.error(e);
  }

  function initButtonClick (swiperManager: SwiperManager) {
    let status = { canceled: false };

    document.getElementById('J-begin')?.addEventListener('click', () => {
      status = { canceled: false };
      void swiperManager.loopPlay({ status });
    });
    for (let i = 0; i <= 5; i++) {
      document.getElementById(`J-lottery-${i}`)?.addEventListener('click', () => {
        status.canceled = true;
        void swiperManager.loopPlay({ stopIndex: i - 1, easing: [0.115, 0, 0.002, 1], speed: 1, disableEvent: 'keepLast' });
      });
    }
  }

})();
