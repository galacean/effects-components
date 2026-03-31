import { Player } from '@galacean/effects';
import { SwiperManager } from '@galacean/effects-components';
import '@galacean/effects-plugin-spine';

const container = document.getElementById('J-container')!;

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*Sp-4Qoz_k2AAAAAAQPAAAAgAelB4AQ';

const slideJSON = [
  'https://mdn.alipayobjects.com/mars/afts/file/A*8Bc2R5rnxwUAAAAAQ9AAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*VNPBSadK2ekAAAAAQaAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*hZVYTKL5TaMAAAAAQ9AAAAgAelB4AQ',
];

(async () => {
  try {
    // 初始化 Player
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });

    const initSlideIndex = 1; // 从0开始
    // 加载合成，可以先只加载主场景和初始幻灯片
    const compositions = await player.loadScene([mainJSON, ...slideJSON]);

    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      composition: compositions[0],
      slideCompositions: compositions.slice(1).map((comp, index) => ({ composition: comp, index, url: slideJSON[index] })),
      player: player,
      options: {
        initSlideIndex,
      },
      handlers: {
        onWillGotoSlide (index) {
          console.info('onWillGotoSlide', index);
        },
      },
    });

    // 准备就绪，创建轮播（如果检测到没有幻灯片，会返回null，比如new SwiperManager没有传slideCompositions且setupLoading没有指定幻灯片数量）
    swiperManager.createSwiper();
  } catch (e) {
    console.error(e);
  }
})();
