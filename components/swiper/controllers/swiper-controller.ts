import type { VFXItem as PlayerVFXItem } from '@galacean/effects';
import { EffectComponent, glContext, SpriteComponent, Texture } from '@galacean/effects';
import { type VideoComponent } from '@galacean/effects-plugin-multimedia';
import type { SwiperData } from '../data/swiper-data';
import { EffectTemplate } from '../data/swiper-data';
import { type Swiper } from '../swiper';
import { assertExist, findItemByName, sleep, sleepForOneFrame } from '../common/utils';
import { disposeTexture, textureFromVideo } from './circle-rotate/rotate-helper';
import type { TextureData, Type } from '../data/types';

/**
 * 卡片轮播控制器
 */
export abstract class SwiperController {
  static VideoComponent: Type<VideoComponent>;
  static effectType: EffectTemplate = EffectTemplate.horizontal;
  /**
   * 卡片总数
   * @internal
   */
  cardCount = 0;
  swiper: Swiper;

  /**
   * 卡片数组
   */
  cardItems: PlayerVFXItem[] = [];
  controlElements: HTMLElement[] = [];
  /**
   * 轮播参数
   */
  protected options: SwiperData;

  direction: 'horizontal' | 'vertical' = 'horizontal';

  autoHide = true;

  videos: (HTMLVideoElement | undefined)[] = [];
  videoTextures: Texture[] = [];
  hasEffectItem = false;
  hideDistanceRatio = 1; // 需要的情况下，可以调整判断隐藏的距离比例
  cardIndexList: number[] = [];

  /**
   *
   * @param options
   */
  constructor (options: SwiperData, swiper: Swiper) {
    this.options = options;
    this.swiper = swiper;
  }

  /**
   *
   * @param visible
   */
  setVisible (visible: boolean) {
    this.handleVisible();
  }

  /**
   *
   * @returns
   */
  getItems () {
    return this.cardItems;
  }

  /**
   * 执行合成轮播
   */
  run (cardItems: PlayerVFXItem[] = [], controlElements: HTMLElement[] = []) {
    if (this.cardCount === 0) {
      this.cardCount = cardItems.length || controlElements.length;
    }

    this.cardItems = cardItems;
    this.controlElements = controlElements;
    this.init();

    this.updateTransform(0, this.swiper.getCurrentIndex() / this.swiper.cardCount);
  }

  reOrderTextureList (texturesList: TextureData[], initCardIndex: number) {
    // 先放当前关卡，再放左右关卡
    const newIndexList = [initCardIndex, (initCardIndex - 1 + this.cardCount) % this.cardCount, (initCardIndex + 1) % this.cardCount];

    // 再放剩余关卡
    for (let i = 0; i < this.cardCount; i++) {
      if (!newIndexList.includes(i)) {
        newIndexList.push(i);
      }
    }

    const reOrderTexturesList: TextureData[] = [];

    for (let i = 0; i < this.cardCount; i++) {
      const index = newIndexList[i];
      const itemList = texturesList.filter(item => item.index === index);

      reOrderTexturesList.push(...itemList);
    }

    return reOrderTexturesList;
  }

  async setUpTexture (
    texturesList: TextureData[],
    options: {
      maxWaitLoadSecond?: number,
      imgMaxWaitLoadSecond?: number,
      videoMaxWaitLoadSecond?: number,
      status?: { canceled: boolean },
      // onOneTextureLoaded?: (data: {arrIndex: number, cardIndex: number}) => void,
      onLoadingTextureLoaded?: (data: { arrIndex: number, cardIndex: number }) => void,
      onVideoFallbackToImage?: (data: { arrIndex: number, cardIndex: number, errMsg: string }) => void,
      onContentTextureLoaded?: (data: { arrIndex: number, cardIndex: number, video?: HTMLVideoElement, textureData: TextureData }) => void,
      initCardIndex?: number,
    } = {},
  ) {
    const { maxWaitLoadSecond = 10, status, onLoadingTextureLoaded, imgMaxWaitLoadSecond, videoMaxWaitLoadSecond, onVideoFallbackToImage, initCardIndex, onContentTextureLoaded } = options;
    const textureMap = new Map<string, Texture>();
    const loadingTextures: Texture[] = [];

    if (initCardIndex !== undefined) {
      texturesList = this.reOrderTextureList(texturesList, initCardIndex);
    }

    const jobs = texturesList.map(async ({ type, url, itemName, index, uniformName, texture, videoSource, loadingImg }, arrIndex) => {
      const ensureFallbackToVideo = async (errMsg: string) => {
        let value: Texture | void;

        if (type === 'video' && videoSource?.downgradeImgUrl) {
          const loadTask = Texture.fromImage(videoSource.downgradeImgUrl, engine);

          value = await Promise.race([loadTask, sleep((imgMaxWaitLoadSecond ?? maxWaitLoadSecond) * 1000)]);
          if (status?.canceled) {
            return;
          }
          if (!value) {
            throw new Error('setUpTexture load timeout, video downgradeImgUrl: ' + videoSource.downgradeImgUrl);
          }
          onVideoFallbackToImage?.({ arrIndex, cardIndex: index, errMsg });
          type = 'image';
        } else {
          throw new Error('setUpTexture load timeout, url = ' + url);
        }

        return value;
      };

      const item = findItemByName(this.cardItems[index], itemName);

      assertExist(item, 'setUpTexture item');
      let prevTexture: Texture | null = null;

      // 先判断是否为同一个
      if (url) {
        prevTexture = await this.getItemTexture({ uniformName, item, type });
        if (prevTexture) {
          // @ts-expect-error
          if (prevTexture._url && prevTexture._url === url) {
            return prevTexture;
          }
        }
      }

      assertExist(this.swiper.composition, 'setUpTexture this.swiper.composition');
      const engine = this.swiper.composition.getEngine();

      if (loadingImg) {
        let loadingTexture = textureMap.get(loadingImg);

        loadingTexture ??= await Texture.fromImage(loadingImg, engine);
        // @ts-expect-error
        loadingTexture._url = `${index}_${type}`;
        if (status?.canceled) {
          return;
        }
        if (!loadingTextures.includes(loadingTexture)) {
          loadingTextures.push(loadingTexture);
        }
        const result = await this.setUpItemTexture({ uniformName, item, type, texture: loadingTexture });

        if (!result) {
          return;
        }
        textureMap.set(loadingImg, loadingTexture);
        onLoadingTextureLoaded?.({ arrIndex, cardIndex: index });
        // 只有自己设置的texture才dispose，原来自带的不要动，防止报destroyed item cannot be used again
        // @ts-expect-error
        if (prevTexture?._url) {
          disposeTexture(prevTexture);
          prevTexture = null;
        }
      }

      texture ??= url ? textureMap.get(url) : undefined;
      const autoPlay = !this.swiper.autoPause || index === (initCardIndex ?? this.swiper.getCurrentIndex());
      let value: Texture | void;

      if (!texture) {
        const begin = Date.now();
        const loadTask = type === 'image' ? Texture.fromImage(url, engine, { magFilter: glContext.LINEAR, minFilter: glContext.LINEAR }) : textureFromVideo(url, engine, videoSource, undefined, autoPlay);

        try {
          const waitTime = type === 'image' ? imgMaxWaitLoadSecond : videoMaxWaitLoadSecond;

          value = await Promise.race([loadTask, sleep((waitTime ?? maxWaitLoadSecond) * 1000)]);
        } catch (e) {
          console.error('加载失败', { type, url });
          value = await ensureFallbackToVideo((e as Error)?.message ?? '未获取到');
        }
        if (!value) {
          console.warn('setUpTexture 视频加载超时，切换到图片');
          value = await ensureFallbackToVideo(`加载超时：${Date.now() - begin}ms`);
        }
        if (!value) {
          return;
        }
        texture = value;
      }
      // @ts-expect-error
      texture._url = url;
      if (status?.canceled) {
        return;
      }
      if (type === 'video') {
        // @ts-expect-error
        const video: HTMLVideoElement = texture.source.video;

        this.videos[index] = video;
        this.videoTextures[index] = texture;
        const result = await this.setUpItemTexture({ uniformName, item, type, texture });

        if (!result) {
          return;
        }
        texture.uploadCurrentVideoFrame();
      } else {
        const result = await this.setUpItemTexture({ uniformName, item, type, texture });

        if (!result) {
          return;
        }
        textureMap.set(url, texture);
      }
      // @ts-expect-error
      if (prevTexture?._url) {
        disposeTexture(prevTexture);
        prevTexture = null;
      }

      onContentTextureLoaded?.({ arrIndex, cardIndex: index, textureData: texturesList[arrIndex],
        // @ts-expect-error
        video: texture.source.video });

      return texture;
    });

    const ret = await Promise.all(jobs);

    if (!status?.canceled && ret.every(texture => texture)) {
      loadingTextures.forEach(texture => {
        disposeTexture(texture);
      });
    }

    return ret;
  }

  private async setUpItemTexture ({ uniformName, item, type, texture }: { uniformName?: string, item: PlayerVFXItem, type: 'image' | 'video', texture: Texture }) {
    if (!uniformName) {
      if (type === 'image') {
        const component = await this.getComponent(item, SpriteComponent);

        if (!component) {
          console.error('setUpItemTexture failed, no SpriteComponent');

          return false;
        }
        component.setTexture(texture);
      } else {
        const component = await this.getComponent(item, SwiperController.VideoComponent);

        if (!component) {
          console.error('setUpItemTexture failed, no VideoComponent');

          return false;
        }
        component.setTexture(texture);
      }
    } else {
      this.hasEffectItem = true;
      const component = await this.getComponent(item, EffectComponent);

      if (!component) {
        console.error('setUpItemTexture failed, no EffectComponent');

        return false;
      }
      component.material.setTexture(uniformName, texture);
    }

    return true;
  }

  private async getItemTexture ({ uniformName, item, type }: { uniformName?: string, item: PlayerVFXItem, type: 'image' | 'video' }) {
    if (!uniformName) {
      if (type === 'image') {
        const component = await this.getComponent(item, SpriteComponent);

        return component?.material.mainTexture ?? null;
      } else {
        const component = await this.getComponent(item, SwiperController.VideoComponent);

        return component?.material.mainTexture ?? null;
      }
    } else {
      const component = await this.getComponent(item, EffectComponent);

      return component?.material.getTexture(uniformName) ?? null;
    }
  }

  setUpUniforms (uniforms: { itemName: string, name: string, value: any, type: 'number' | 'vector4', cardIndex: number }[]) {
    uniforms.forEach(async ({ itemName, name, value, type, cardIndex }) => {
      const item = findItemByName(this.cardItems[cardIndex], itemName);

      assertExist(item, 'setUpUniforms item');
      const component = await this.getComponent(item, EffectComponent);

      if (type === 'number') {
        component?.material.setFloat(name, value);
      } else {
        component?.material.setVector4(name, value);
      }
    });
  }

  async getComponent (item: PlayerVFXItem, Component: any, retryCount = 4): Promise<any> {
    const component = item.getComponent(Component);

    if (component) {
      return component;
    }
    if (retryCount > 0) {
      await sleepForOneFrame();

      return this.getComponent(item, Component, retryCount - 1);
    } else {
      console.error('[Swiper Controller] get EffectComponent failed');
    }
  }

  onWillGotoCard (cardIndex: number) {
    if (!this.videos.length) {
      return;
    }
    if (!this.swiper.autoPause) {
      return;
    }
    this.resumeVideo(cardIndex);
  }

  resumeVideo (cardIndex: number) {
    this.videos.forEach((video, index) => {
      if (index !== cardIndex) {
        video?.pause();
      }
    });
    void this.videos[cardIndex]?.play();
  }

  resumePlayCurrentVideo () {
    this.resumeVideo(this.swiper.getCurrentIndex());
  }

  // async onAfterPlayEnterAnimation (iniCardIndex: number) {}

  updateValue (key: string, value: number) {}

  updateTransform (progressInSlide: number, progressInTotal: number, speed?: number) {
    const data = this.getTransformByProgress({ progressInSlide, progressInTotal, speed });

    if (!data.positions.length) {
      return;
    }

    if (!this.swiper.downgrade) {
      this.updateGETransform(data);
    } else {
      this.updateDOMTransform(data);
    }

    // this.onTransform(this.cardItems);
    if (this.autoHide) {
      this.handleVisible();
    }

  }

  updateGETransform (data: { positions: [number, number, number][], rotations?: [number, number, number][] }) {
    const { positions, rotations } = data;

    for (let i = 0; i < positions.length; i++) {
      const composition = this.cardItems[i];

      if (!composition) {
        return;
      }
      const [x, y, z] = positions[i];

      composition.setPosition(x, y, z);
      if (rotations) {
        const [x, y, z] = rotations[i];

        composition.setRotation(x, y, z);
      }
    }
  }

  updateDOMTransform (data: { positions: [number, number, number][], rotations?: [number, number, number][] }) {
    const { positions, rotations } = data;
    const { canvasBounding } = this.swiper;

    for (let i = 0; i < positions.length; i++) {
      const element = this.controlElements[i];

      if (!element) {
        return;
      }
      const [x, y, z] = positions[i];
      const bounding = element.getBoundingClientRect();

      element.style.transform = `translate3d(${x + canvasBounding.width / 2 - bounding.width / 2}px, ${y + canvasBounding.height / 2 - bounding.height / 2}px, ${z}px)`;
      if (rotations) {
        const [x, y, z] = rotations[i];

        element.style.transform += ` rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
      }
    }
  }

  onSlidePark (cardIndex: number) {
    void this.videos[cardIndex]?.play();
  }

  onSlideOut (cardIndex: number, progress: number, data: { speed?: number, leftCount?: number, isDrag?: boolean }) {}
  onSlideIn (cardIndex: number, progress: number, data: { speed?: number, leftCount?: number, isDrag?: boolean }) {}
  onProgress (progress: number, data: { speed?: number, dragDirection: number, totalDirection: number, progressInSlide: number }) {}
  onDragDirectionReverse () {}
  onDragExceedSlide () {}
  onDragSwap () {}

  ensureUploadVideoTexture () {
    if (this.hasEffectItem) {
      this.videos.forEach((video, index) => {
        if (video && !video.paused) {
          this.videoTextures[index].uploadCurrentVideoFrame();
        }
      });
    }
  }

  private handleVisible () {
    const { composition, canvasBounding, widthRatio } = this.swiper;

    if (!composition) {
      return;
    }
    const canvasWidth = canvasBounding.width * widthRatio * this.hideDistanceRatio;

    this.cardItems.forEach((cardItem, index) => {
      // 超出屏幕中心一屏的合成隐藏
      const { x } = cardItem.transform.position;
      const visible = x > -canvasWidth && x < canvasWidth;

      cardItem.setVisible(visible);
    });
  }

  abstract getTransformByProgress ({
    progressInSlide,
    progressInTotal,
    speed,
  }: {
    progressInSlide: number,
    progressInTotal: number,
    speed?: number,
  }): {
    positions: [number, number, number][],
    rotations?: [number, number, number][],
  };

  onPlayerTick () {}

  // can be overridden by subclasses
  init () {}

  toRotate (degree: number) {
    return degree / 180 * Math.PI;
  }

  toDegree (rotate: number) {
    return rotate / Math.PI * 180;
  }

  chooseXY (): number {
    return 0; // 'x'
  }

  getDistance (distance: number, diffFromStart: number) {
    return distance;
  }

  getDistanceZ () {
    return 0;
  }

  willPlayBack (progressInCard: number): boolean | void {}

  dispose () {}
}
