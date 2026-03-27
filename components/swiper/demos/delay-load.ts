import { Player } from '@galacean/effects';
import { defaultLoadingJSON, SwiperManager } from '@galacean/effects-components';

const container = document.getElementById('J-container')!;

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*kZerQpmQjyQAAAAAQQAAAAgAelB4AQ';

const slideJSON = [
  'https://mdn.alipayobjects.com/mars/afts/file/A*2EbxRYfFRosAAAAAQTAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*wmK9TK--HhAAAAAAQWAAAAgAelB4AQ',
  'https://mdn.alipayobjects.com/mars/afts/file/A*evuFQb-qnysAAAAAQWAAAAgAelB4AQ',
];

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
    const compositions = await player.loadScene([mainJSON, slideJSON[initCardIndex]]);

    // 初始化轮播管理器
    const swiperManager = new SwiperManager({
      composition: compositions[0],
      // 传递幻灯片的合成数据
      slideCompositions: [{
        composition: compositions[1], // 合成，作为代表轮播幻灯片的控制对象
        index: initCardIndex, // 当前幻灯片的索引
        url: slideJSON[initCardIndex], // 当前合成的url（用于区分不同的幻灯片内容）
        // id: slideJSON[initCardIndex] + initCardIndex, // 如果多个幻灯片使用同一个url，则可以通过id来区分（可选）
      }],
      player: player,
      options: {
        initCardIndex,
        loop: false,
      },
      handlers: {
        // 需要在合成中添加交互元素，点击回调才能生效
        onSlideClick (clickIndex, itemNames) {
          console.info('clickIndex', clickIndex, 'itemNames', itemNames);
        },
      },
    });

    // 加载 loading 动画，并指定幻灯片数量
    // 同时传递一个 loading 动画，用于在加载剩余幻灯片时显示（组件提供了一个，就是在幻灯片中间显示一行白色文字“加载中...”）
    const totalCardCount = 3;

    await swiperManager.setUpLoading(totalCardCount, defaultLoadingJSON);

    // 准备就绪，创建轮播（如果检测到没有幻灯片，会返回null，比如new SwiperManager没有传slideCompositions且setupLoading没有指定幻灯片数量）
    swiperManager.createSwiper();

    // 加载剩余的幻灯片合成
    void swiperManager.loadSlides([{
      url: slideJSON[0],
      index: 0,
    }, {
      url: slideJSON[2],
      index: 2,
    }]);

    // 模拟替换幻灯片
    // 自动增删改，如果检测到有未加载过的合成，会自动loadScene（区分标志为url）
    // setTimeout(() => {
    //   const newSlidesList = [{
    //     url: slideJSON[1],
    //   }, {
    //     url: 'https://mdn.alipayobjects.com/mars/afts/file/A*-vnVTbKEliAAAAAAQXAAAAgAelB4AQ',
    //     options: { // loadScene传的参数
    //       variables: {},
    //     }
    //   }, {
    //     url: slideJSON[2],
    //   }]
    //
    //   // 只需传递有变化的参数
    //   const newSwiperOptions: Partial<SwiperData> = {
    //     initCardIndex: 1,
    //   };
    //
    //   swiperManager.replaceSlides(newSlidesList, newSwiperOptions)
    // }, 5000);

  } catch (e) {
    console.error(e);
  }
})();
