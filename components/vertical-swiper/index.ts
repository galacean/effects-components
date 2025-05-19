import type { Player, Disposable, Composition, Scene } from '@galacean/effects';
import { AssetManager, EventEmitter, math } from '@galacean/effects';

/**
 * 场景数据
 */
export type SceneData = {
  name: string,
  json: Scene.LoadType,
  image?: string,
  variables?: Record<string, any>,
  fadeColor?: string,
  loopInterval?: number,
  maxDuration?: number,
};

/**
 * 垂直滑动配置项
 */
export type VerticalSwiperOptions = {
  scenes: SceneData[],
  fadeMask: HTMLElement | null,
  /**
   * 过渡模式
   * @default 'fade'
   */
  transitionMode?: 'fade' | 'mask',
  /**
   * 过渡时间
   * @default 500
   */
  transitionDuration?: number,
  /**
   * 最大兼容偏移角度
   * @default 35
   */
  maxTriggerAngle?: number,
  /**
   * 最小上滑触发距离
   * @default 100
   */
  minTriggerDistanceBottomToTop?: number,
  /**
   * 最下下拉触发距离
   * @default 250
   */
  minTriggerDistanceTopToBottom?: number,
};

/**
 * 垂直滑动事件
 */
export type VerticalSwiperEvent = {
  /**
   * 场景切换后的回调
   * @param info - 场景信息
   */
  ['after-scene-change']: [info: { index: number, name: string, composition: Composition }],

  /**
   * 切换到最后一个场景回调
   * @param info - 场景信息
   */
  ['last-scene']: [info: { index: number }],
  /**
   * 切换到第一个场景回调
   * @param info - 场景信息
   */
  ['first-scene']: [info: { index: number }],
};

type TouchData = {
  startX: number,
  startY: number,
  endY?: number,
  direction?: string,
};

// 最大兼容偏移角度
const DEFAULT_MAX_TRIGGER_ANGLE = 35;
// 最小上滑触发距离
const DEFAULT_MIN_TRIGGER_DISTANCE_BOTTOM_TO_TOP = 100;
// 最下下拉触发距离
const DEFAULT_MIN_TRIGGER_DISTANCE_TOP_TO_BOTTOM = 250;
const defaultOptions: Partial<VerticalSwiperOptions> = {
  transitionMode: 'fade',
  transitionDuration: 500,
  maxTriggerAngle: DEFAULT_MAX_TRIGGER_ANGLE,
  minTriggerDistanceBottomToTop: DEFAULT_MIN_TRIGGER_DISTANCE_BOTTOM_TO_TOP,
  minTriggerDistanceTopToBottom: DEFAULT_MIN_TRIGGER_DISTANCE_TOP_TO_BOTTOM,
};

/**
 *
 */
export class VerticalSwiper extends EventEmitter<VerticalSwiperEvent> implements Disposable {
  /**
   * Player 的容器
   */
  public readonly container: HTMLElement | null;

  private touchData: TouchData = {
    startX: 0,
    startY: 0,
  };
  private prevTouchData: TouchData = {
    startX: 0,
    startY: 0,
  };
  private readonly options: Required<VerticalSwiperOptions>;
  private currentIndex = 0;
  private sceneData: Scene[] = [];
  private currentComposition: Composition;
  private loopRafId = 0;
  private swipeRafId = 0;

  /**
   *
   * @param player
   * @param options
   */
  constructor (
    private readonly player: Player,
    options: VerticalSwiperOptions,
  ) {
    super();

    this.options = { ...defaultOptions, ...options } as Required<VerticalSwiperOptions>;
    this.container = player.container;
    this.bindEvents();
  }

  /**
   * 场景预加载
   */
  async preload () {
    const { scenes } = this.options;

    this.sceneData = await Promise.all(scenes.map(scene => {
      const { variables } = scene;
      const assetsManager = new AssetManager({ variables });

      return assetsManager.loadScene(scene.json);
    }));
  }

  /**
   *
   * @param index
   */
  async run (index = 0) {
    const player = this.player;
    const { scenes } = this.options;
    const scene = scenes[index];
    const { loopInterval, variables, name } = scene;
    let json = scene.json;

    if (this.currentComposition) {
      this.currentComposition.dispose();
    }

    if (this.sceneData.length !== 0) {
      json = this.sceneData[index];
    }

    if (index === 0) {
      this.emit('first-scene', { index });
    }

    if (index === scenes.length - 1) {
      this.emit('last-scene', { index });
    }

    const composition = await player.loadScene(json, { variables });

    this.emit('after-scene-change', { index, name, composition });

    this.currentIndex = index;
    this.currentComposition = composition;

    if (loopInterval) {
      this.loopAnimation(composition, loopInterval);
    }
  }

  /**
   * 获取当前场景索引
   * @returns
   */
  getCurrentIndex () {
    return this.currentIndex;
  }

  /**
   * 获取当前场景数据
   * @returns
   */
  getCurrentScene () {
    return this.options.scenes[this.currentIndex];
  }

  private loopAnimation (composition: Composition, loopInterval: number) {
    if (composition.time >= loopInterval / 1000) {
      composition.setSpeed(-1);
    }
    if (composition.time <= 0) {
      composition.setSpeed(1);
    }
    this.loopRafId = requestAnimationFrame(this.loopAnimation.bind(this, composition, loopInterval));
  }

  private async swipeScene (reverse = false) {
    const composition = this.currentComposition;
    const { scenes, transitionMode, transitionDuration } = this.options;
    const currentScene = scenes[this.currentIndex];
    const { maxDuration } = currentScene;

    composition?.setSpeed(1);
    cancelAnimationFrame(this.loopRafId);

    if (!maxDuration || composition?.time >= maxDuration / 1000) {
      cancelAnimationFrame(this.swipeRafId);
      this.swipeRafId = 0;

      if (reverse) {
        this.currentIndex--;
      } else {
        this.currentIndex++;
      }

      transitionMode === 'fade' && this.setFadeOut();

      await this.run(this.currentIndex);

      if (transitionMode === 'fade') {
        await sleep(transitionDuration);
        this.setFadeIn();
      }

      return;
    }

    this.swipeRafId = requestAnimationFrame(this.swipeScene.bind(this, reverse));
  }

  private bindEvents () {
    this.container?.addEventListener('touchstart', this.handleTouchStart);
    this.container?.addEventListener('mousedown', this.handleTouchStart);
    this.container?.addEventListener('touchmove', this.handleTouchMove);
    this.container?.addEventListener('mousemove', this.handleTouchMove);
    this.container?.addEventListener('touchend', this.handleTouchEnd);
    this.container?.addEventListener('touchcancel', this.handleTouchEnd);
    window.addEventListener('mouseup', this.handleTouchEnd, true);
  }

  private unbindEvents () {
    this.container?.removeEventListener('touchstart', this.handleTouchStart);
    this.container?.removeEventListener('mousedown', this.handleTouchStart);
    this.container?.removeEventListener('touchmove', this.handleTouchMove);
    this.container?.removeEventListener('mousemove', this.handleTouchMove);
    this.container?.removeEventListener('touchend', this.handleTouchEnd);
    this.container?.removeEventListener('touchcancel', this.handleTouchEnd);
    window.removeEventListener('mouseup', this.handleTouchEnd, true);
  }

  private handleTouchStart = (event: TouchEvent | MouseEvent) => {
    let { clientX, clientY } = event as MouseEvent;

    if ('touches' in event) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    }

    this.touchData = {
      startX: clientX,
      startY: clientY,
    };
    this.prevTouchData = this.touchData;

    console.debug('Slide start', this.touchData);
  };

  private handleTouchMove = (event: TouchEvent | MouseEvent) => {
    const { maxTriggerAngle } = this.options;
    const { startX: prevStartX = 0, startY: prevStartY = 0 } = this.prevTouchData;
    let { clientX, clientY } = event as MouseEvent;

    if ('touches' in event) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    }

    const prevPoint = new math.Vector2(prevStartX, prevStartY);
    const currentPoint = new math.Vector2(clientX, clientY);

    // 移动距离短时忽略回调
    if (prevPoint.distance(currentPoint) < 50) {
      return;
    }

    this.prevTouchData = { startX: clientX, startY: clientY };

    const xDist = this.touchData.startX - clientX || 0;
    const yDist = this.touchData.startY - clientY || 0;
    const angle = Math.atan2(yDist, xDist);
    const swipeAngle = Math.round((angle * 180) / Math.PI);
    let direction = '';

    if (Math.abs(swipeAngle - 90) <= maxTriggerAngle) {
      direction = 'bottomToTop';
    } else if (Math.abs(swipeAngle - 180) <= maxTriggerAngle) {
      direction = 'leftToRight';
    } else if (Math.abs(swipeAngle - 0) <= maxTriggerAngle) {
      direction = 'rightToLeft';
    } else if (Math.abs(swipeAngle + 90) <= maxTriggerAngle) {
      direction = 'topToBottom';
    }

    if (!this.touchData.direction) {
      console.debug(`Slide process: ${direction}, x: ${clientX}, y: ${clientY}`);
    }
    this.touchData.direction = direction;
  };

  private handleTouchEnd = (event: TouchEvent | MouseEvent) => {
    const { minTriggerDistanceBottomToTop, minTriggerDistanceTopToBottom } = this.options;
    let { clientX, clientY } = event as MouseEvent;

    if ('touches' in event) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    }

    this.touchData.endY = clientY;

    const { direction = '', endY, startY } = this.touchData;
    const distance = Math.abs(endY - startY);
    let desc = 'Below the threshold (Ignore)';

    if (direction === 'topToBottom' && distance > minTriggerDistanceTopToBottom) {
      desc = direction;
      void this.handlePrev();
    }
    if (direction === 'bottomToTop' && distance > minTriggerDistanceBottomToTop) {
      desc = direction;
      void this.handleNext();
    }

    console.debug('Slide end', {
      desc,
      distance,
      direction,
      x: clientX,
      y: clientY,
    });
  };

  /**
   * 切换到下一个场景
   */
  async handleNext () {
    if (this.swipeRafId) {
      return;
    }
    if (this.currentIndex === this.options.scenes.length - 1) {
      return;
    }
    await this.swipeScene();
  }

  /**
   * 切换到上一个场景
   * @returns
   */
  async handlePrev () {
    if (this.swipeRafId) {
      return;
    }
    if (this.currentIndex === 0) {
      return;
    }
    await this.swipeScene(true);
  }

  private setFadeOut () {
    const { fadeMask } = this.options;

    if (!fadeMask) { return; }

    const { fadeColor = '#fff' } = this.options.scenes[this.currentIndex];

    fadeMask.style.backgroundColor = fadeColor;
    fadeMask.classList.remove('fade-in');
    fadeMask.classList.add('fade-out');
  }

  private setFadeIn () {
    const { fadeMask } = this.options;

    if (!fadeMask) { return; }

    fadeMask.classList.remove('fade-out');
    fadeMask.classList.add('fade-in');
    fadeMask.style.backgroundColor = 'rgba(0, 0, 0, 0)';
  }

  /**
   *
   * @param disposePlayer
   */
  dispose (disposePlayer = true): void {
    if (disposePlayer) {
      this.player?.dispose();
    }
    this.unbindEvents();
  }
}

function sleep (time: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
}
