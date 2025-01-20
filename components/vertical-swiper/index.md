## VerticalSwiper

### 简单使用

``` ts
import { Player } from '@galacean/effects';
import { VerticalSwiper } from '@galacean/effects-components/es/vertical-swiper';

const container = document.getElementById('J-container');
const player = new Player({
  container,
  notifyTouch: true,
  interactive: true,
});
const swiper = new VerticalSwiper(player, {
  scenes,
});

await swiper.run();
```

> 详细使用请参考 [VerticalSwiper Demo](https://github.com/galacean/effects-components/tree/main/components/vertical-swiper/demo/)
