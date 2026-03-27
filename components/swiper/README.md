## GE Swiper

### 使用方法
根据不同场景，提供了几种使用方法，可自行选择。
#### 自动初始化
最简单的用法，轮播由设计人员在 GE 编辑器配置好，开发引入 Swiper 组件，然后加载 JSON 播放。使用方法见：[auto.ts](demos/auto.ts)。
#### 手动初始化
常规用法，自行初始化轮播，扩展性较强。使用方法见：[index.ts](demos/index.ts)。
#### 延迟加载
如果轮播的幻灯片数量较多，可先加载初始化展示的幻灯片，然后延迟加载其他幻灯片。使用方法见：[delay-load.ts](demos/delay-load.ts)。
#### 替换幻灯片
当用户进行一些操作后，幻灯片的数量、内容或顺序可能发生变化，可通过替换幻灯片来实现。使用方法见：[replace-slice.ts](demos/replace-slide.ts)。
#### 降级
降级需要写HTML/CSS，详见[downgrade.html](demos/downgrade.html)。主要是增加绝对定位，以及每个幻灯片的内容以及类名，然后传给轮播。轮播使用方法见：[downgrade.ts](demos/downgrade.ts)。

### API
可调用的API：
```typescript
// 跳转到指定的幻灯片（索引从0开始）
swiper.gotoSlideIndex(slideIndex);
```

可监听的回调函数：

```typescript
// 当幻灯片切换时触发
import {SwiperHandlers} from '@alipay/ge-effects-components';

const handlers: SwiperHandlers = {
  // 幻灯片停住时触发
  onSlidePark: (slideIndex) => {
    console.log('onSlidePark', slideIndex);
  },
  // 手松开时将要跳转到指定幻灯片时触发
  onWillGotoCard: (slideIndex) => {
    console.log('onWillGotoCard', slideIndex);
  },
  // 当前滑入的幻灯片及进度
  onSlideIn: (slideIndex, progress) => {
    console.log('onSlideIn', slideIndex, progress);
  },
  // 当前滑出的幻灯片及进度
  onSlideOut: (slideIndex, progress) => {
    console.log('onSlideOut', slideIndex, progress);
  },
  // 整体滑动的进度
  onProgress: (currentCardIndex, progress) => {
  },
};
```

可定制的参数。修改这些参数，可覆盖轮播在 GE 编辑器中的设定。

```typescript
import {SwiperPlugin, SwiperData} from '@alipay/ge-effects-components';

const config: SwiperData = {
  initCardIndex: number, // 初始化定位的卡片索引，从0开始
  loop: boolean, // 是否循环
  autoPlay: boolean, // 是否自动播放
  autoPlaySpeed: number, // 自动播放速度
  autoPlayInterval: number, // 自动播放停留间隔
  slideNames: string[], // 需要显示的幻灯片预合成元素名称及顺序（仅loadScene传一个合成时生效）
}; // 具体参数详见SwiperData的定义
```

### 开发一个自定义轮播效果模板
仓库提供了5种内置的轮播效果模板，可根据需要开发自定义的轮播效果模板。这 5 个模板分别为:
- 横向，代码实现见：[horizontal-controller](./controllers/horizontal-controller.ts)
- 纵向，代码实现见：[vertical-controller](./controllers/vertical-controller.ts)
- 圆弧，代码实现见：[arc-controller](./controllers/arc-rotate-controller.ts)
- 圆形 - 正向朝向，代码实现见：[circle-front-controller](./controllers/circle-front-controller.ts)
- 圆形 - 弯曲带倾斜，代码实现见：[circle-rotate-controller](./controllers/circle-rotate-controller.ts)

可以参考这 5 个模板（特别是[圆形 - 正向朝向](./controllers/circle-front-controller.ts)）开发自定义的轮播效果模板。
一个最简单的效果模板如下所示：
```typescript
export class CustomController extends SwiperController {
  static override effectType = 'custom';

  getTransformByProgress({ progressInTotal }: {progressInTotal: number}) {
    const positions: [number, number, number][] = [];
    const rotations: [number, number, number][] = []
    for (let i = 0; i < this.cardCount; i++) {
      positions.push([0, 0, 0]);
      rotations.push([0, 0, 0]);
    }
    return { positions, rotations };
  }
}

swiperControllerMap[CustomController.effectType] = CustomController;
```
最少要实现```getTransformByProgress```方法。在这个方法中，根据当前轮播转动的进度，计算出每个幻灯片的位置及旋转信息。通过```this.options```可以拿到配置的参数。
开发完毕后，修改```effectTemplate```参数，就可以使用自定义的轮播效果模板了，如下代码所示：

```typescript
import {SwiperManager} from "@galacean/effects-components";
import './custom-controller';

const options: SwiperData = {
  effectTemplate: 'custom',
};
new SwiperManager({options});
```
