## Swiper

### 简单使用

``` ts
import { Player } from '@galacean/effects';
import { Swiper, SwiperController } from '@galacean/effects-components/es/swiper';

const container = document.getElementById('J-container')!;
const player = new Player({
  container,
  notifyTouch: true,
  interactive: true,
});
// 加载需要轮播的合成
const compositions = await player.loadScene([
  '1.json',
  '2.json',
  '3.json',
  '4.json',
  '5.json',
]);
// 设定合成摆放间距
const controller = new SwiperController({
   /**
    * 合成间的距离
    */
   distance: 10,
   /**
    * 超出屏幕的合成是否自动隐藏
    */
   autoHide: true,
});
const initCardIndex = 3;

// 在指定 DOM 容器上绑定滚动事件并通知 swiperController
// 也可以使用社区组件和对应属性 https://swiperjs.com/swiper-api#prop-swiper-progress
const swiper = new Swiper(container, {
  initCardIndex,
  onProgress: (progress, currentCardIndex) => {
    controller.updateTransform(progress);
  },
});

// 开始监听滚动
swiper.run(controller, compositions);
```


