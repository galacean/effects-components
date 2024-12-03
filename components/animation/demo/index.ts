import { Player } from '@galacean/effects';
import { AnimationComponent } from '@galacean/effects-components';
import { SIZE_CURVE } from './sizeCurve';

const mainJSON = 'https://mdn.alipayobjects.com/mars/afts/file/A*CWJTRbQ8oGUAAAAAAAAAAAAADlB4AQ';
const container = document.getElementById('J-container');


(async () => {
  try {
    const player = new Player({
      container,
      interactive: true,
    });
    const comp = await player.loadScene(mainJSON);

    comp.on('click', ret => {
      const index = ret.name.split('_')[1];
      const controller = comp.getItemByName(`null_${index}`);
      const animationComponent = controller!.addComponent(AnimationComponent);

      animationComponent.play(SIZE_CURVE);
    })
  } catch (e) {
    console.info(e);
  }
})();
