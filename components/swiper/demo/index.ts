import { AbstractPlugin, Player, VFXItem, registerPlugin } from '@galacean/effects';
import { Swiper } from '@galacean/effects-components';

class MockPlugin extends AbstractPlugin { }
class MockVFXItem extends VFXItem<any> { }
registerPlugin('spine', MockPlugin, MockVFXItem);
registerPlugin('orientation-transformer', MockPlugin, MockVFXItem);

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*opZMTKzsq4oAAAAAAAAAAAAADlB4AQ';
const container = document.getElementById('J-container');
const renderLevel = /render-level=(A|B|S)/i.test(location.search) ? RegExp.$1 : 'S';
const cardIdList = ['sports', 'shake', 'scan', 'draw', 'forest', 'tab3'];
const cardDataList = [{
  begin: true, // true 为红色按钮，false 为黄色按钮
  btn: '扫福得福卡',
  bubble: '文案最多八个字', // 汽泡文案
}, {
  begin: false,
  btn: '找能量得福卡',
  bubble: '这是汽泡~',
}, {
  begin: true,
  btn: '摇一摇得福卡',
  bubble: '气泡气泡气泡',
}, {
  begin: false,
  btn: '画年画得福卡',
  bubble: '',
}, {
  begin: false,
  btn: '走99步得福卡',
  bubble: '这是汽泡~',
}, {
  begin: true,
  btn: '送福气得福卡',
}];
const buttonConfig = {
  images: [
    'https://mdn.alipayobjects.com/huamei_p0cigc/afts/img/A*O4HKSpQRovYAAAAAAAAAAAAADoB5AQ/original', // 开始带tip
    'https://mdn.alipayobjects.com/huamei_p0cigc/afts/img/A*pf_aRJ3Oz3oAAAAAAAAAAAAADoB5AQ/original', // 开始不带tip
    'https://mdn.alipayobjects.com/huamei_p0cigc/afts/img/A*fg6cTKmc-WwAAAAAAAAAAAAADoB5AQ/original', // 未开始不带tip
    'https://mdn.alipayobjects.com/huamei_p0cigc/afts/img/A*nqToSpH8va4AAAAAAAAAAAAADoB5AQ/original', // 未开始带tip
  ],
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
      // renderLevel,
      templateScale: 2,
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

    // 注意：此处便于演示，如有类似使用，请记得 clearInterval
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
 * 注意：使用文本元素可不用关心 text 和 tip 的设置
 * @returns
 */
function updateVariables () {
  const variables: Record<string, string> = {};
  const { images } = buttonConfig;

  cardDataList.forEach((data, index) => {
    const prefix = cardIdList[index];

    variables[`${prefix}_text`] = data.btn;

    if (data.bubble) {
      variables[`${prefix}_tip`] = data.bubble;
      variables[`${prefix}_btn`] = data.begin ? images[0] : images[3];
    } else {
      variables[`${prefix}_tip`] = '';
      variables[`${prefix}_btn`] = data.begin ? images[1] : images[2];
    }
  });

  return variables;
}
