## AnimationComponent
动态添加运动曲线

### 简单使用

``` ts
import { Player } from '@galacean/effects';
import { AnimationComponent } from '@galacean/effects-components/es/animation';

const container = document.getElementById('J-container');
const player = new Player({
  container,
  notifyTouch: true,
  interactive: true,
});
const composition = await player.loadScene('xx.json');
const item = composition.getItemByName('itemToAdd');
const ac = item.addComponent(AnimationComponent);

// 需要播放的时刻
// curve从编辑器复制导出
ac.play(Curve)
```
