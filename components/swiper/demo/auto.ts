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
      'https://mdn.alipayobjects.com/mars/afts/file/A*MT-HQYi9c5IAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*xJ65QJJKvgEAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*_NdEQJ-7YSYAAAAAAAAAAAAADlB4AQ',
      'https://mdn.alipayobjects.com/mars/afts/file/A*u-NFTK_DS0IAAAAAAAAAAAAAelB4AQ',
    ], { reusable: true });
    const cardCount = compositions.length;
    const initCardIndex = 0;

    // 初始化控制器，并设定合成摆放间距
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

    controller.run(compositions, initCardIndex);

    // 监听合成播放结束事件，自动轮播
    compositions.forEach((composition, index) => {
      composition.on('end', () => {
        const nextIndex = (swiper.getCurrentIndex() + 1) % cardCount;

        swiper.gotoCardIndex(nextIndex);
        // 合成播放结束后，需要重置合成状态，否则 end 事件不会触发
        composition.restart();
      });
    });
  } catch (e) {
    console.error('biz', e);
  }
})();
