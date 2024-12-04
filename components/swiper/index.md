## Swiper

### 简单使用

``` ts
import { Player } from '@galacean/effects';
import { Swiper } from '@galacean/effects-components/es/swiper';

const container = document.getElementById('J-container');
const player = new Player({
  container,
  notifyTouch: true,
  interactive: true,
});
const composition = await player.loadScene('xx.json', {
  // 最长等待加载时间，超过则使用降级
  timeout: 6,
});
const cardIdList = ['sports', 'shake', 'scan', 'draw', 'forest', 'tab3'];
const swiper = new Swiper(player, {
  cardIdList,
  initCardIndex: Math.floor(cardIdList / 2),
});

swiper.run(composition);
```
