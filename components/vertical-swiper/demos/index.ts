import { Player, TextComponent } from '@galacean/effects';
import { VerticalSwiper } from '@galacean/effects-components';

const container = document.getElementById('J-container');
const scenes = [
  {
    'name': 'BEGIN',
    'json': 'https://mdn.alipayobjects.com/mars/afts/file/A*XJUnTKU2FbIAAAAAAAAAAAAAelB4AQ',
    'image': 'https://mdn.alipayobjects.com/graph_jupiter/afts/img/A*dAY-RqiuSuUAAAAAAAAAAAAAesF2AQ/original',
    'fadeColor': '#3198de',
    'loopInterval': 1900,
    'maxDuration': 7200,
  },
  {
    'name': 'GREEN_CODE',
    'json': 'https://mdn.alipayobjects.com/mars/afts/file/A*m_FiS728a9YAAAAAAAAAAAAAelB4AQ',
    'image': 'https://mdn.alipayobjects.com/graph_jupiter/afts/img/A*nlbyTYqStegAAAAAAAAAAAAAesF2AQ/original',
    'fadeColor': '#feb76e',
  },
  {
    'name': 'DYNAMIC_IMAGE',
    'json': 'https://mdn.alipayobjects.com/mars/afts/file/A*PubBSpHUbjYAAAAAAAAAAAAADlB4AQ',
    'fadeColor': '#000000',
    'variables': {
      'image': 'https://mdn.alipayobjects.com/huamei_klifp9/afts/img/A*ySrfRJvfvfQAAAAAAAAAAAAADvV6AQ/original',
    },
  },
  {
    'name': 'SPORT',
    'json': 'https://mdn.alipayobjects.com/mars/afts/file/A*3vqTTaIYf30AAAAAAAAAAAAAelB4AQ',
    'image': 'https://mdn.alipayobjects.com/graph_jupiter/afts/img/A*y_rbS63fSKUAAAAAAAAAAAAAesF2AQ/original',
    'fadeColor': '#95bd86',
  },
  {
    'name': 'TEXT',
    'json': 'https://mdn.alipayobjects.com/mars/afts/file/A*cUOFTpkoAf0AAAAAAAAAAAAADlB4AQ',
    'fadeColor': '#000000',
    'variables': {
      'text_1': 'Galacean Effects'.toLocaleUpperCase().split('').reverse().join(''),
    },
  },
  {
    'name': 'LOVE_DONATE',
    'json': 'https://gw.alipayobjects.com/os/gltf-asset/mars-cli/DWUMLELXFYER/46739595-b071b.json',
    'image': 'https://mdn.alipayobjects.com/graph_jupiter/afts/img/A*8ks7QrzzlFgAAAAAAAAAAAAAesF2AQ/original',
    'fadeColor': '#dad3a0',
  },
  {
    'name': 'OFFLINE_CONSUME',
    'json': 'https://mdn.alipayobjects.com/mars/afts/file/A*O9jyTYptLGQAAAAAAAAAAAAAelB4AQ',
    'image': 'https://mdn.alipayobjects.com/graph_jupiter/afts/img/A*IllfRL_gdeoAAAAAAAAAAAAAesF2AQ/original',
    'fadeColor': '#f0bd77',
  },
];

(async () => {
  try {
    const player = new Player({
      container,
      notifyTouch: true,
      interactive: true,
    });
    const swiper = new VerticalSwiper(player, {
      fadeMask: document.getElementById('J-fadeMask'),
      scenes,
    });

    swiper.on('after-scene-change', ({ index, name, composition }) => {
      console.debug(`Current scene: ${name}, index: ${index}`);

      if (name === 'TEXT') {
        const textItem = composition.getItemByName('text_2');
        const textComponent = textItem?.getComponent(TextComponent);

        textComponent?.setTextColor([255, 0, 0, 1]);
        textComponent?.setText('基于 Web\n效果丰富，氛围粒子、陀螺仪特效、3D 模型渲染\n100%还原');
      }
    });

    await swiper.preload();
    await swiper.run();

    document.getElementById('J-loading')?.remove();
  } catch (e) {
    // 此处做降级处理
    console.error('biz', e);
  }
})();
