import { Player } from '@galacean/effects';
import '@galacean/effects-plugin-spine';
import { Swiper, SwiperController } from '@galacean/effects-components';

const container = document.getElementById('J-container');

(async () => {
  try {
    // 初始化Player
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });

    // 加载需要轮播的合成
    const compList = await player.loadScene([
      'https://mdn.alipayobjects.com/mars/afts/file/A*_NdEQJ-7YSYAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*u-NFTK_DS0IAAAAAAAAAAAAAelB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*UdPYTKUFqQMAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*MT-HQYi9c5IAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*xJ65QJJKvgEAAAAAAAAAAAAADlB4AQ'
    ]);

    // 设定合成摆放间距
    const swiperController = new SwiperController({
      distance: 10,
      autoHide: true,
      cardCount: compList.length,
    });
    const initCardIndex = 3;
    // 在指定DOM容器上绑定滚动事件的监听, 也可以使用社区组件的属性https://swiperjs.com/swiper-api#prop-swiper-progress
    const swiper = new Swiper(container!, {
      initCardIndex: initCardIndex,
      cardCount: 5,
      onProgress: (progress, currentCardIndex) => {
        swiperController.updateTransform(progress);
      },
      onGotoCard: () => {

      },
    });

    swiper.run();
    swiperController.run(compList, initCardIndex);

  } catch (e) {
    console.error('biz', e);
  }
})();
