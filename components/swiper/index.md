## Swiper

### 简单使用

``` ts
import { Player } from '@galacean/effects';
import { Swiper, SwiperController } from '@galacean/effects-components/es/swiper';

const container = document.getElementById('J-container');
const player = new Player({
  container,
  notifyTouch: true,
  interactive: true,
  pixelRatio: window.devicePixelRatio,
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
   /**
   * 合成间的距离
   */
   distance: 10,
   /**
   * 超出屏幕的合成是否自动隐藏
   */
   autoHide: true,
   /**
   * 合成数量
   */
   cardCount: compList.length,
});
const initCardIndex = 3;

// 在指定DOM容器上绑定滚动事件并通知 swiperController
// 也可以使用社区组件和对应属性 https://swiperjs.com/swiper-api#prop-swiper-progress
const swiper = new Swiper(container!, {
  initCardIndex: initCardIndex,
  onProgress: (progress, currentCardIndex) => {
    swiperController.updateTransform(progress);
  },
});

// 开始监听滚动
swiper.run();
swiperController.run(compList, initCardIndex);

```


