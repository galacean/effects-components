import { Player } from '@galacean/effects';
import { SwiperManager, EffectTemplate } from '@galacean/effects-components';
import '../controllers/circle-front-controller';

const container = document.getElementById('J-container')!;

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*SrjeQq3eoMYAAAAAQKAAAAgAelB4AQ';

(async () => {
  try {
    // 初始化 Player
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });

    const initCardIndex = 1;
    // 加载合成，可以先只加载主场景和初始幻灯片
    const composition = await player.loadScene(mainJSON);

    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      composition: composition,
      player: player,
      options: {
        initCardIndex,
        effectTemplate: EffectTemplate.circleFront,
        loop: true,
        radius: 3,
        // autoPlay: false,
      },
      handlers: {
        onWillGotoCard: index => {
          console.info('onWillGotoCard', index);
        },
      },
    });

    // 准备就绪，创建轮播（如果检测到没有幻灯片，会返回null，比如new SwiperManager没有传slideCompositions且setupLoading没有指定幻灯片数量）
    swiperManager.createSwiper();
  } catch (e) {
    console.error(e);
  }
})();
