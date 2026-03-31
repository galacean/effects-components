import type { AnimationType } from './data/swiper-data';
import { EffectTemplate, getDefaultSwiperData, type SwiperData } from './data/swiper-data';
import type { Composition, Player, SceneLoadOptions } from '@galacean/effects';
import type { VFXItem as PlayerVFXItem } from '@galacean/effects';
import { Swiper } from './swiper';
import { AnimationClip } from './animate/animation-clip';
import { assertExist, clamp, findItemById, sleepForOneFrame } from './common/utils';
import type { SwiperHandlers, Type } from './data/types';
import { defaultLoadingJSON, SwiperController } from './index';
import { type VideoComponent } from '@galacean/effects-plugin-multimedia';
import { geJSONData } from './data/json-data';
import { animationTransition } from './animate/animation-transition';

export class SwiperManager {
  options: SwiperData;
  handlers: SwiperHandlers;
  private swiper: Swiper | null = null;
  player?: Player;
  composition?: Composition;
  slideCompositions: { composition: Composition, index: number, url: string, id?: string }[] = [];
  controlItems: PlayerVFXItem[] = [];
  controlElements: HTMLElement[] = [];
  static getCanvasBounding?: () => DOMRect;
  static VideoComponent: Type<VideoComponent>;

  private disposers: (() => void)[] = [];
  private playCanceled: boolean[][] = [];
  private currentPlayId: number[] = [];
  private slideLoadingJSON: any;
  private downgrade = false;
  private downgradeSwiperElement?: HTMLElement;
  private downgradeSlideSelector = '';
  private cameraOptions: any;
  private autoPause = true;
  private currentPlayAnimationNames: AnimationType[] = [];
  private currentPlayAnimationTimes: number[] = [];

  constructor ({
    options = {},
    handlers = {},
    composition,
    player,
    slideCompositions = [],
    downgrade = false,
    downgradeSwiperElement,
    downgradeSlideSelector,
    cameraOptions,
    autoPause,
    animationList = [],
  }: {
    options?: Partial<SwiperData>,
    handlers?: SwiperHandlers,
    composition?: Composition,
    player?: Player,
    slideCompositions?: { composition: Composition, index: number, url: string, id?: string }[],
    downgrade?: boolean,
    downgradeSwiperElement?: HTMLElement,
    downgradeSlideSelector?: string,
    cameraOptions?: any,
    autoPause?: boolean,
    animationList?: any[],
  }) {
    if (!downgrade) {
      assertExist(composition, 'not downgrade, composition is required');
      assertExist(player, 'not downgrade, player is required');
    }
    this.downgrade = downgrade;
    this.downgradeSwiperElement = downgradeSwiperElement;
    this.downgradeSlideSelector = downgradeSlideSelector ?? '';
    const config = composition ? geJSONData.configs[composition.id] ?? {} : {};

    this.options = { ...getDefaultSwiperData(), ...config, ...options };
    this.fixOptions();
    this.handlers = handlers;
    this.player = player;
    this.composition = composition;
    this.slideCompositions = slideCompositions;
    this.cameraOptions = cameraOptions;
    this.autoPause = autoPause ?? true;
    animationList.forEach(animation => {
      geJSONData.animations[animation.id] = animation;
    });
  }

  fixOptions () {
    if ([EffectTemplate.circleFront, EffectTemplate.circle].includes(this.options.effectTemplate)) {
      this.options.loop = true;
    }
  }

  async setUpLoading (slideCount: number, loadingJSON: any) {
    let j = 0;
    const newSlideCompositions: { composition: Composition, index: number, url: string }[] = [];

    for (let i = 0; i < slideCount; i++) {
      if (j < this.slideCompositions.length && this.slideCompositions[j].index === i) {
        newSlideCompositions.push(this.slideCompositions[j]);
        j++;
      } else {
        assertExist(this.player, 'setUpLoading this.player');
        const composition = await this.player.loadScene(loadingJSON);

        newSlideCompositions.push({ index: i, composition, url: '' });
      }
    }
    this.slideLoadingJSON = loadingJSON;
    this.slideCompositions = newSlideCompositions;
  }

  static hasSwiper (composition: Composition) {
    return !!geJSONData.configs[composition.id];
  }

  getSwiper () {
    return this.swiper;
  }

  createSwiper (): Swiper | null {
    SwiperController.VideoComponent = SwiperManager.VideoComponent;
    this.setControlItems();
    this.mergeSlidesConfig();
    if (!this.controlItems.length && !this.controlElements.length) {
      console.warn('Swiper doesn\'t have a slide');

      return null;
    }
    this.currentPlayId = (this.downgrade ? this.controlElements : this.controlItems).map(() => 0);
    this.playCanceled = (this.downgrade ? this.controlElements : this.controlItems).map(() => []);

    const targetElement = this.downgrade ? this.downgradeSwiperElement : this.player?.canvas;

    assertExist(targetElement, 'targetElement');

    this.swiper = new Swiper({
      target: targetElement,
      composition: this.composition,
      cameraOptions: this.cameraOptions ?? (this.composition ? geJSONData.cameras[this.composition?.id] : undefined),
      controlItems: this.controlItems,
      controlElements: this.controlElements,
      downgrade: this.downgrade,
      autoPause: this.autoPause,
    }, this.options, {
      ...this.handlers,
      onSlidePark: (slideIndex, data) => {
        this.playIdleAndCenterAnimation();
        this.handlers.onSlidePark?.(slideIndex, data);
        this.swiper?.controller.onSlidePark(slideIndex);
      },
      onSlideIn: (slideIndex, progress, data) => {
        this.stopAllPlay();
        const animationType = this.slideInSplit(slideIndex) ? (data.side === 'left' ? 'slideInAnimationLeft' : 'slideInAnimationRight') : 'slideInAnimation';
        const slideInAnimation = this.getAnimationId(slideIndex, animationType);

        this.swiper?.controller.onSlideIn(slideIndex, progress, data);
        if (!slideInAnimation) {
          return;
        }
        const prevAnimationType = this.currentPlayAnimationNames[slideIndex];
        const stopTransitionProgress = this.options.centerToSlideOutSplit;

        if (!this.downgrade && ['centerAnimation'].includes(prevAnimationType) && progress >= (1 - stopTransitionProgress)) {
          const slideInAnimationClip = this.getAnimationClip(slideInAnimation, slideIndex);

          animationTransition({
            progress: (1 - progress) / (1 - stopTransitionProgress),
            animationClipA: this.getAnimationClip(this.getAnimationId(slideIndex, 'centerAnimation'), slideIndex),
            animationClipB: slideInAnimationClip,
            aTime: this.currentPlayAnimationTimes[slideIndex],
            bTime: stopTransitionProgress * slideInAnimationClip.duration,
            vfxItem: this.controlItems[slideIndex],
          });
        } else {
          this.playAnimationClipFrame(slideInAnimation, progress, slideIndex, animationType);
        }
        this.handlers.onSlideIn?.(slideIndex, progress, data);
      },
      onSlideOut: (slideIndex, progress, data) => {
        this.stopAllPlay();
        const animationType = this.slideInSplit(slideIndex) ? (data.side === 'left' ? 'slideInAnimationLeft' : 'slideInAnimationRight') : 'slideInAnimation';
        const slideInAnimation = this.getAnimationId(slideIndex, animationType);

        this.swiper?.controller.onSlideOut(slideIndex, progress, data);
        if (!slideInAnimation) {
          return;
        }

        const prevAnimationType = this.currentPlayAnimationNames[slideIndex];
        const stopTransitionProgress = prevAnimationType === 'centerAnimation' ? 1 - this.options.centerToSlideOutSplit : 1 - this.options.enterToSlideOutSplit;

        if (!this.downgrade && ['centerAnimation', 'idleAnimationRight'].includes(prevAnimationType) && progress <= stopTransitionProgress) {
          const slideInAnimationClip = this.getAnimationClip(slideInAnimation, slideIndex);

          animationTransition({
            progress: progress / stopTransitionProgress,
            animationClipA: this.getAnimationClip(prevAnimationType === 'centerAnimation' ? this.getAnimationId(slideIndex, 'centerAnimation') : this.getAutoIdleAnimation(slideIndex, prevAnimationType as 'idleAnimation'), slideIndex),
            animationClipB: slideInAnimationClip,
            aTime: this.currentPlayAnimationTimes[slideIndex],
            bTime: (1 - stopTransitionProgress) * slideInAnimationClip.duration,
            vfxItem: this.controlItems[slideIndex],
          });
        } else {
          this.playAnimationClipFrame(slideInAnimation, 1 - progress, slideIndex, animationType);
        }
        this.handlers.onSlideOut?.(slideIndex, progress, data);
      },
      onSlidesIdle: slideIndexList => {
        assertExist(this.swiper, 'onSlidesIdle this.swiper');
        const { slideIndexList: orderedSlideIndexList } = this.swiper.controller;

        slideIndexList.forEach(i => {
          assertExist(this.swiper, 'onSlidesIdle this.swiper');
          const animationName = this.idleSplit(i) ?
            (orderedSlideIndexList.indexOf(i) < orderedSlideIndexList.indexOf(this.swiper.getCurrentIndex()) ? 'idleAnimationLeft' : 'idleAnimationRight') : 'idleAnimation';

          // 如果有自定义idle动画，则在onSlidePark中处理
          if (!this.getAnimationId(i, animationName)) {
            const autoIdleName = this.slideInSplit(i) ?
              (orderedSlideIndexList.indexOf(i) < orderedSlideIndexList.indexOf(this.swiper.getCurrentIndex()) ? 'idleAnimationLeft' : 'idleAnimationRight') : 'idleAnimation';

            this.playIdleAnimationBySlideIn(i, autoIdleName);
          }
        });
        this.handlers.onSlidesIdle?.(slideIndexList);
      },
      onProgress: (progress, data) => {
        this.handlers.onProgress?.(progress, data);
      },
      onWillGotoSlide: (slideIndex, data) => {
        this.handlers.onWillGotoSlide?.(slideIndex, data);
        this.sortRenderOrder();
      },
      getCanvasBounding: SwiperManager.getCanvasBounding,
    });

    if (!this.downgrade) {
      assertExist(this.composition, 'this.composition');
      this.initPlayPause(this.composition);
      if (this.handlers.onSlideClick) {
        this.initGEClickEvent();
      }
      if (this.options.enterEnabled && this.options.autoPlayEnterAnimation) {
        void this.ensurePlayEnterAnimation();
      }
      this.sortRenderOrder();
      this.ensureUploadVideoFrame();
      this.ensureControllerUpdate();
    } else {
      if (this.handlers.onSlideClick) {
        this.initDOMClickEvent();
      }
      this.playIdleAndCenterAnimation();
      if (this.options.autoResize) {
        this.listenContainerResize();
      }
    }

    if (this.downgrade || !this.options.enterAnimation) { // 有入场动画，onSlidePark在入场动画结束后再播
      this.handlers.onSlidePark?.(this.options.initSlideIndex, { addSlideCount: 0 });
    }

    return this.swiper;
  }

  async loopPlay ({
    speed = 1,
    stopIndex,
    loopCount = 1,
    easing = [0.1, 0.1, 0.9, 0.9],
    disableEvent = 'total',
    animationName,
    duration,
    status = { canceled: false },
  }: {
    speed?: number,
    stopIndex?: number,
    easing?: [number, number, number, number],
    disableEvent?: 'none' | 'total' | 'keepLast',
    animationName?: string,
    duration?: number,
    loopCount?: number,
    status?: { canceled: boolean },
  } = {}) {
    assertExist(this.swiper, 'loopPlay this.swiper');
    // 循环播放时，先播放idle动画（动画不要动了）
    for (let i = 0; i < this.swiper.slideCount; i++) {
      this.increaseCurrentPlayId(i);
      animationName ||= this.idleSplit(i) ? 'idleAnimationRight' : 'idleAnimation';
      if (!this.getAnimationId(i, animationName as 'idleAnimation')) {
        const autoIdleName = this.slideInSplit(i) ? 'idleAnimationRight' : 'idleAnimation';

        this.playIdleAnimationBySlideIn(i, autoIdleName);
      }
    }
    const play = (): Promise<void> => {
      assertExist(this.swiper, 'loopPlay this.swiper');
      this.swiper.currentDirection = 1;
      const playCount = stopIndex === undefined ? this.swiper.slideCount * loopCount : stopIndex - this.swiper.getCurrentIndex() + this.swiper.slideCount * loopCount;

      this.swiper.disableControl = true;

      return this.swiper.fastPlay(playCount, {
        playDuration: duration || this.swiper.slideCount * 0.15 * speed * 1000,
        easing,
        disableEvent,
        status,
      }).then(() => {
        if (!status.canceled && stopIndex === undefined) {
          return play();
        }
      });
    };

    await play().finally(() => {
      if (this.swiper) {
        this.swiper.disableControl = false;
      }
    });

  }

  private listenContainerResize () {
    if (!this.downgradeSwiperElement || !window.ResizeObserver) {
      console.warn('Swiper doesn\'t have a container or ResizeObserver is not supported');

      return;
    }
    // eslint-disable-next-line compat/compat
    const resizeObserver = new ResizeObserver(() => {
      this.swiper?.updateLength();
      this.swiper?.triggerProgressEvents();
    });

    resizeObserver.observe(this.downgradeSwiperElement);
    this.disposers.push(() => {
      resizeObserver.disconnect();
    });
  }

  // 将currentSlideIndex的渲染层级摆在最上面
  private sortRenderOrder () {
    if (!this.options.autoRenderOrder) {
      return;
    }
    if (!this.swiper) {
      console.warn('swiper has disposed');

      return;
    }
    const currentItem = this.controlItems[this.swiper.getCurrentIndex()];
    const children = [currentItem];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      child.renderOrder = child.renderOrder + 999;
      if (child.children) {
        children.push(...child.children);
      }
    }
    assertExist(this.composition, 'sortRenderOrder this.composition');
    // 触发一次渲染
    this.composition.setVisible(false);
    this.composition.setVisible(true);
  }

  private initGEClickEvent () {
    const handleClick = (e: any) => {
      for (let i = 0; i < this.slideCompositions.length; i++) {
        const { composition } = this.slideCompositions[i];
        const hitBoxList = composition.hitTest(e.x, e.y);

        if (hitBoxList.length) {
          this.handlers.onSlideClick?.(i, hitBoxList.map(({ name }) => name));

          break;
        }
      }
    };

    // @ts-expect-error
    const { event } = this.player;

    event.addEventListener('click', handleClick);
    this.disposers.push(() => {
      event.removeEventListener('click', handleClick);
    });
  }

  private initDOMClickEvent () {
    const handleClick = (e: MouseEvent) => {
      const slideElement = (e.target as HTMLElement).closest(this.downgradeSlideSelector);
      let index = -1;

      if (slideElement && slideElement.parentElement) {
        const slideElements = Array.from(slideElement.parentElement.querySelectorAll(this.downgradeSlideSelector));

        index = slideElements.indexOf(slideElement);
      }
      if (index >= 0) {
        this.handlers.onSlideClick?.(index, []);
      }
    };

    this.downgradeSwiperElement?.addEventListener('click', handleClick);
    this.disposers.push(() => {
      this.downgradeSwiperElement?.removeEventListener('click', handleClick);
    });
  }

  async replaceSlides (slideCompositionList: { url: string, options?: SceneLoadOptions, id?: string }[], options: Partial<SwiperData>, { loadingJSON, keepCompositions = [] }: { loadingJSON?: any, keepCompositions?: string[] } = {}) {
    const disableDrag = this.swiper?.disableDrag;
    const autoPause = this.swiper?.autoPause;

    await this.dispose();
    await sleepForOneFrame(); // 等一帧，等stop生效
    const newSlideCompositions: { url: string, options?: SceneLoadOptions, index: number, id?: string }[] = [];

    if (!this.downgrade) {
      const existSlideCompositions: typeof this.slideCompositions = [];
      const existOriginCompositions: typeof this.slideCompositions = [];

      slideCompositionList.forEach(({ url, options, id }, newIndex) => {
        const data = this.slideCompositions.find(data => {
          // 如果有id，则优先使用id匹配是否同一个合成（因为可能会有同一个slide用同一个url文件）
          return data.id ? data.id === id : data.url === url;
        });

        if (data) {
          existOriginCompositions.push(data);
          existSlideCompositions.push({
            composition: data.composition,
            index: newIndex,
            url,
          });
        } else {
          newSlideCompositions.push({
            url,
            options,
            index: newIndex,
            id,
          });
        }
      });
      // 销毁被删除的合成
      this.slideCompositions.forEach(data => {
        if (!keepCompositions.includes(data.composition.name) && !existOriginCompositions.includes(data)) {
          data.composition.dispose();
        }
      });
      const newSlideCount = slideCompositionList.length;

      this.slideCompositions = existSlideCompositions;
      this.controlItems.length = newSlideCount;
      await this.setUpLoading(newSlideCount, loadingJSON ?? this.slideLoadingJSON ?? defaultLoadingJSON);
    }
    this.options = { ...this.options, ...options };
    this.createSwiper();
    if (this.swiper) {
      this.swiper.disableDrag = !!disableDrag;
      this.swiper.autoPause = autoPause ?? true;
    }
    if (!this.downgrade) {
      // 加载新的合成
      await this.loadSlides(newSlideCompositions);
    }

    return this.swiper;
  }

  async loadSlides (slideCompositionList: { index: number, url: string, id?: string, options?: SceneLoadOptions }[]) {
    console.info('[GE-Swiper]loadSlides', slideCompositionList);
    const jobs = slideCompositionList.map(async ({ index, url, options, id }) => {
      assertExist(this.player, 'loadSlides this.player');
      const composition = await this.player.loadScene(url, options);

      // 触发player onError
      if (!composition) {
        return;
      }
      const origin = this.slideCompositions.find(data => data.index === index);

      assertExist(origin, 'loadSlides origin');
      assertExist(this.swiper, 'loadSlides this.swiper');
      origin.composition.dispose();
      this.slideCompositions[index] = { index, composition, url, id };
      const controlItems = this.swiper.getControlItems();

      controlItems[index] = composition.rootItem;
      this.mergeSlidesConfig();
      this.swiper.controller.updateTransform(0, this.swiper.getProgress());
    });

    await Promise.all(jobs);

    this.playIdleAndCenterAnimation();
    if (this.composition?.getPaused()) {
      this.composition?.setTime(this.composition?.time);  // 暂停情况下需要渲染一帧
      // 暂停情况下只播一帧
      this.stopAllPlay();
    }
  }

  async ensurePlayEnterAnimation () {
    if (!this.swiper) {
      return;
    }
    const { enterAnimation, enterDuration, enterEasing, enterLoopCount } = this.options;
    const { disableDrag } = this.swiper;

    // this.swiper.controller.onSlidePark(this.options.initSlideIndex);
    this.swiper.disableDrag = true;
    this.swiper.playingEnterAnimation = true;

    await this.loopPlay({
      disableEvent: this.options.enterDisableSlideIn ? 'keepLast' : 'none',
      duration: enterDuration * 1000,
      animationName: enterAnimation,
      easing: enterEasing,
      stopIndex: this.options.initSlideIndex,
      loopCount: enterLoopCount,
    }).finally(() => {
      if (this.swiper) {
        this.swiper.disableDrag = disableDrag;
        this.swiper.playingEnterAnimation = false;
      }
    });

    this.currentPlayAnimationTimes = [];
    this.swiper.handlers.onSlidePark?.(this.options.initSlideIndex, { addSlideCount: 0 });
    this.swiper.controller.onWillGotoSlide(this.options.initSlideIndex); // 视频播放
    this.handlers.onEnterAnimationEnd?.();
  }

  private ensureUploadVideoFrame () {
    const update = () => {
      this.swiper?.controller.ensureUploadVideoTexture();
    };

    assertExist(this.player, 'ensureUploadVideoFrame this.player');
    this.disposers.push(this.player.on('update', update));
  }

  private ensureControllerUpdate () {
    const update = () => {
      this.swiper?.controller.onPlayerTick();
    };

    assertExist(this.player, 'ensureControllerUpdate this.player');
    this.disposers.push(this.player.on('update', update));
  }

  private getAnimationId (slideIndex: number, animationType: AnimationType) {
    return this.options.slides[slideIndex]?.[animationType] || this.options[animationType];
  }

  private slideInSplit (slideIndex: number) {
    return this.options.slides[slideIndex]?.slideInSplit ?? this.options.slideInSplit;
  }

  private idleSplit (slideIndex: number) {
    return this.options.slides[slideIndex]?.idleSplit ?? this.options.idleSplit;
  }

  private mergeSlidesConfig () {
    if (this.slideCompositions.length) {
      for (const [compositionId, slideData] of Object.entries(geJSONData.slideDataMap)) {
        const index = this.slideCompositions.findIndex(({ composition }) => composition.id === compositionId);

        this.options.slides[index] = { ...this.options.slides[index], ...slideData };
      }
    }
  }

  private setControlItems () {
    // 降级
    if (this.downgrade) {
      assertExist(this.downgradeSwiperElement, 'setControlItems this.downgradeSwiperElement');
      this.controlElements = Array.from(this.downgradeSwiperElement.querySelectorAll(this.downgradeSlideSelector));

      return;
    }
    // 非降级
    if (this.slideCompositions.length) {
      this.controlItems = this.slideCompositions.map(({ composition }) => composition.rootItem);
    } else {
      this.controlItems = this.options.slides.map(slide => {
        assertExist(this.composition, 'setControlItems this.composition');

        return findItemById(this.composition.rootItem, slide.controlItemId)!;
      });
      if (this.options.slideNames.length) {
        const visibleItems: PlayerVFXItem[] = [];

        this.options.slideNames.forEach(name => {
          const item = this.controlItems.find(theItem => theItem.name === name);

          if (item) {
            visibleItems.push(item);
          }
        });
        this.controlItems.forEach(item => {
          if (!visibleItems.find(theItem => theItem.name === item.name)) {
            item.setVisible(false);
            item.isActive = false;
            item.setScale(0, 0, 0);
          }
        });
        this.controlItems = visibleItems;
      }
    }
  }

  playIdleAndCenterAnimation () {
    assertExist(this.swiper, 'playIdleAndCenterAnimation this.swiper');
    const currentSlideIndex = this.swiper.getCurrentIndex();
    const length = this.downgrade ? this.controlElements.length : this.controlItems.length;
    const { slideIndexList } = this.swiper.controller;

    for (let i = 0; i < length; i++) {
      if (i !== currentSlideIndex) {
        const playId = this.increaseCurrentPlayId(i);
        const animationName = this.idleSplit(i) ?
          (slideIndexList.indexOf(i) < slideIndexList.indexOf(currentSlideIndex) ? 'idleAnimationLeft' : 'idleAnimationRight') : 'idleAnimation';

        // 如果自定义idle动画，则使用；否则自动取slideIn的第一帧
        if (this.getAnimationId(i, animationName)) {
          this.loopPlaySlideAnimation(i, animationName, playId, true);
        } else {
          const autoIdleName = this.slideInSplit(i) ?
            (slideIndexList.indexOf(i) < slideIndexList.indexOf(currentSlideIndex) ? 'idleAnimationLeft' : 'idleAnimationRight') : 'idleAnimation';

          this.playIdleAnimationBySlideIn(i, autoIdleName);
        }
      }
    }
    const playId = this.increaseCurrentPlayId(currentSlideIndex);
    const startPlayTime = this.currentPlayAnimationNames[currentSlideIndex] === 'centerAnimation' ? (this.currentPlayAnimationTimes[currentSlideIndex] * 1000 || 0) : 0;

    this.loopPlaySlideAnimation(currentSlideIndex, 'centerAnimation', playId, this.options.centerAnimationLoop, startPlayTime);
  }

  playIdleAnimationBySlideIn (slideIndex: number, animationType: 'idleAnimationLeft' | 'idleAnimationRight' | 'idleAnimation') {
    const slideInAnimation = this.getAutoIdleAnimation(slideIndex, animationType);

    if (!slideInAnimation) {
      return;
    }
    this.playAnimationClipFrame(slideInAnimation, 0, slideIndex, animationType);
  }

  private getAutoIdleAnimation (slideIndex: number, animationType: 'idleAnimationLeft' | 'idleAnimationRight' | 'idleAnimation') {
    const slideInAnimationName = animationType.replace('idle', 'slideIn') as 'slideInAnimationLeft' | 'slideInAnimationRight' | 'slideInAnimation';
    const slideInAnimation = this.getAnimationId(slideIndex, slideInAnimationName);

    return slideInAnimation;
  }

  private initPlayPause (composition: Composition) {
    const handlePause = () => {
      assertExist(this.swiper, 'handlePause this.swiper');
      this.stopAllPlay();
      // 直接stop会导致卡片不摆正居中
      // this.swiper.stopCurrentPlay();
    };

    const handlePlay = () => {
      this.sortRenderOrder();
      assertExist(this.swiper, 'handlePlay this.swiper');
      this.playIdleAndCenterAnimation();

      // 如果有进场动画，则等进场动画播放完成再开始自动播放
      if (this.options.autoPlay && !this.options.enterEnabled) {
        this.swiper.beginAutoPlay();
      }
    };

    this.disposers.push(composition.on('play', handlePlay));
    if (!composition.getPaused()) {
      handlePlay();
    } else {
      this.playIdleAndCenterAnimation();
      composition.setTime(composition.time); // 暂停情况下需要渲染一帧
      // 暂停情况下只播一帧
      this.stopAllPlay();
    }

    this.disposers.push(composition.on('pause', handlePause));

  }

  private loopPlaySlideAnimation (slideIndex: number, animationType: 'centerAnimation' | 'idleAnimation' | 'idleAnimationLeft' | 'idleAnimationRight', playId: number, loop: boolean, startPlayTime = 0) {
    const animation = this.getAnimationId(slideIndex, animationType);

    if (!animation) {
      return;
    }
    this.loopPlayAnimationClip(animation, this.controlItems[slideIndex], slideIndex, playId, loop, -1, startPlayTime);
    this.currentPlayAnimationNames[slideIndex] = animationType;
  }

  private playAnimationClipFrame (animationId: string, progress: number, slideIndex: number, animationType: AnimationType) {
    const clip = this.getAnimationClip(animationId, slideIndex);
    const time = progress * clip.duration;

    this.sampleTheAnimation(clip, slideIndex, time);
    this.currentPlayAnimationNames[slideIndex] = animationType;
  }

  private sampleTheAnimation (clip: AnimationClip, slideIndex: number, time: number) {
    if (this.downgrade) {
      assertExist(this.swiper, 'sampleTheAnimation this.swiper');
      clip.sampleElement(this.controlElements[slideIndex].children[0] as HTMLElement, time, this.swiper.widthRatio);
    } else {
      const controlItem = this.controlItems[slideIndex];

      clip.sampleAnimation(controlItem, time);
    }
    this.currentPlayAnimationTimes[slideIndex] = time;
  }

  private loopPlayAnimationClip (animationId: string, controlItem: PlayerVFXItem, slideIndex: number, playId: number, loop: boolean, beginTime = -1, startPlayTime = 0) {
    if (!this.playCanceled[slideIndex] || this.playCanceled[slideIndex][playId]) {
      return;
    }
    const clip = this.getAnimationClip(animationId, slideIndex);

    const render = (currentTime: number) => {
      if (this.playCanceled[slideIndex][playId]) {
        return;
      }
      if (beginTime <= 0) {
        beginTime = currentTime;
      }
      let time = 0;

      if (loop) {
        time = (currentTime - beginTime + startPlayTime) % (clip.duration * 1000);
      } else {
        time = clamp(currentTime - beginTime + startPlayTime, 0, clip.duration * 1000);
      }
      this.sampleTheAnimation(clip, slideIndex, time / 1000);
      if (!loop && currentTime - beginTime + startPlayTime > clip.duration * 1000) {
        return;
      }
      if (beginTime > 0) {
        this.loopPlayAnimationClip(animationId, controlItem, slideIndex, playId, loop, beginTime, startPlayTime);
      }
    };

    // 需要立刻渲染（否则从slideIn到center动画可能缺一帧，导致抖动，比如slideIn动画最后一帧隐藏，center动画第一帧显示）
    if (beginTime < 0) {
      render(0);
    }
    this.swiper?.renderScheduler.requestAnimationFrame(render);
  }

  private getAnimationClip (animationId: string, slideIndex: number) {
    let clip = geJSONData.animationClips[animationId + slideIndex];

    if (!clip) {
      clip = new AnimationClip();
      clip.fromData(geJSONData.animations[animationId]);
      geJSONData.animationClips[animationId + slideIndex] = clip;
    }

    return clip;
  }

  private increaseCurrentPlayId (slideIndex: number) {
    for (let i = 0; i < this.playCanceled[slideIndex].length; i++) {
      this.playCanceled[slideIndex][i] = true;
    }
    const newId = (this.currentPlayId[slideIndex] + 1) % 10;

    this.currentPlayId[slideIndex] = newId;
    this.playCanceled[slideIndex][newId] = false;

    return newId;
  }

  stopAllPlay () {
    this.playCanceled.forEach(data => {
      for (let i = 0; i < data.length; i++) {
        data[i] = true;
      }
    });
  }

  async dispose () {
    return new Promise<void>(resolve => {
      window.setTimeout(() => { // 由于createSwiper是setTimeout 0，所以这里也需要setTimeout 0
        this.destroy();
        resolve();
      }, 0);
    });
  }

  destroy () {
    this.stopAllPlay();
    if (this.swiper) {
      this.swiper.dispose();
      this.swiper = null;
    }
    this.disposers.forEach(disposer => disposer());
    this.disposers = [];
  }
}
