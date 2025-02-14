import { Player } from '@galacean/effects';
import '@galacean/effects-plugin-spine';
import { Swiper, SwiperController } from '@galacean/effects-components';

const container = document.getElementById('J-container')!;

(async () => {
  try {
    // 初始化 Player
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });

    // 加载需要轮播的合成
    const compositions = await player.loadScene([
      'https://mdn.alipayobjects.com/mars/afts/file/A*UdPYTKUFqQMAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*MT-HQYi9c5IAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*xJ65QJJKvgEAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*_NdEQJ-7YSYAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*u-NFTK_DS0IAAAAAAAAAAAAAelB4AQ',
    ]);
    const cardCount = compositions.length;
    const initCardIndex = 3;

    // 设定合成摆放间距
    const controller = new SwiperController({
      distance: 10,
      autoHide: true,
    });

    // 在指定 DOM 容器上绑定滚动事件并通知 swiperController
    // 也可以使用社区组件的属性 https://swiperjs.com/swiper-api#prop-swiper-progress
    const swiper = new Swiper(container, {
      initCardIndex,
      cardCount,
      onProgress: (progress, _) => {
        controller.updateTransform(progress);
      },
    });

    swiper.run(controller, compositions);
  } catch (e) {
    console.error('biz', e);
  }
})();
