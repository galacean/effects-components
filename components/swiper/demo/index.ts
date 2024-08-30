import { Player } from '@galacean/effects';
import { Swiper } from '@galacean/effects-components';

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*MNAsR7ftcu4AAAAAAAAAAAAADlB4AQ';
const container = document.getElementById('J-container');
const renderLevel = /render-level=(A|B|S)/i.test(location.search) ? RegExp.$1 : 'S';
const cardIdList = ['tab3', 'forest', 'farm', 'fu', 'scan', 'shake'];
const cardDataList = [{
  begin: true, // true 为红色按钮，false 为黄色按钮
  btn: '扫福得福卡',
}, {
  begin: false,
  btn: '找能量得福卡',
}, {
  begin: true,
  btn: '摇一摇得福卡',
}, {
  begin: false,
  btn: '画年画得福卡',
}, {
  begin: false,
  btn: '走99步得福卡',
}, {
  begin: true,
  btn: '送福气得福卡',
}];
const buttonConfig = {
  image_disable: 'https://mdn.alipayobjects.com/huamei_klifp9/afts/img/A*8JGASK4kWkAAAAAAAAAAAAAADvV6AQ/original',
};
let initCardIndex = 2;
let timer;

(async () => {
  try {
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
      fps: ['A', 'B'].includes(renderLevel) ? 45 : 60,
      pixelRatio: window.devicePixelRatio,
    });
    const variables = updateVariables();
    const composition = await player.loadScene(mainJSON, {
      variables,
      // 最长等待加载时间，超过则使用降级
      // timeout: 10,
    });

    if (!composition) {
      throw new Error('composition not exist');
    }
    const swiper = new Swiper(player, {
      cardIdList,
      initCardIndex,
    });

    swiper.run(composition);

    timer = setInterval(() => {
      swiper.gotoCardIndex(++initCardIndex % cardIdList.length);
    }, 2000);
  } catch (e) {
    // 此处做降级处理
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    console.error('biz', e);
  }
})();

/**
 * 更新数据模板变量
 * @returns
 */
function updateVariables () {
  const variables: Record<string, string> = {};

  cardDataList.forEach((data, index) => {
    const prefix = cardIdList[index];

    variables[`${prefix}_btn_txt`] = data.btn;
    if (data.begin) {
      variables[`${prefix}_btn`] = buttonConfig.image_disable;
    }
  });

  return variables;
}
