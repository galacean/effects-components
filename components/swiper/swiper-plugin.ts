import type { CompositionSlideData, SwiperData } from './data/swiper-data';
import type { Composition, Player, spec as SPEC } from '@galacean/effects';
import { Plugin, registerPlugin } from '@galacean/effects';
import { SwiperManager } from './swiper-manager';
import { geJSONData } from './data/json-data';

// Augment the global scope
declare global {
  interface SwiperData {
    sliders: any[],
  }
}

type SwiperJSON = {
  sliders: {
    compositionId: string,
    data: SwiperData,
  }[],
  slide: CompositionSlideData,
};

type JSONScene = SPEC.JSONScene & SwiperJSON;

export class SwiperPlugin extends Plugin {
  override name = 'swiper';
  static autoCreateSwiper = false;
  static getPlayer: () => Player;
  static swiperManagers: SwiperManager[] = [];

  // @ts-expect-error
  override async onAssetsLoadStart ({ jsonScene }: { jsonScene: JSONScene }) {
    const json = jsonScene;

    json.sliders?.forEach(slider => {
      geJSONData.configs[slider.compositionId] = slider.data;
    });
    json.animations?.forEach(animation => {
      geJSONData.animations[animation.id] = animation;
    });
    if (json.slide) {
      const slideData = json.slide;

      geJSONData.slideDataMap[json.compositions[0].id] = slideData;
    }
    if (json.sliders?.length) {
      geJSONData.cameras[json.compositions[0].id] = json.compositions[0].camera;
    }
  }

  override onCompositionCreated (composition: Composition) {
    if (SwiperPlugin.autoCreateSwiper && SwiperManager.hasSwiper(composition)) {
      // 初始化预合成的轮播
      window.setTimeout(() => { // 等composition.refContent/camera等构建完成
        const swiperManager = new SwiperManager({ composition, player: SwiperPlugin.getPlayer() });

        swiperManager.createSwiper();
        SwiperPlugin.swiperManagers.push(swiperManager);
        composition.refContent.forEach((refItem: any) => {
          if (geJSONData.configs[refItem.guid] && refItem.guid !== composition.id) {
            const subSwiperManager = new SwiperManager({
              composition,
              player: SwiperPlugin.getPlayer(),
              options: geJSONData.configs[refItem.guid],
            });

            subSwiperManager.createSwiper();
            SwiperPlugin.swiperManagers.push(subSwiperManager);
          }
        });
      }, 0);
    }
  }

  override onCompositionDestroy (composition: Composition) {
    if (SwiperPlugin.autoCreateSwiper && SwiperManager.hasSwiper(composition)) {
      SwiperPlugin.swiperManagers.forEach(swiperManager => {
        void swiperManager.dispose();
      });
      SwiperPlugin.swiperManagers = [];
      // @ts-expect-error
      geJSONData.configs[composition.id] = undefined;
      composition.refContent.forEach((refItem: any) => {
        if (geJSONData.configs[refItem.guid] && refItem.guid !== composition.id) {
          // @ts-expect-error
          configs[refItem.guid] = undefined;
        }
      });
    }
  }

}

// @ts-expect-error
registerPlugin('swiper', SwiperPlugin);

