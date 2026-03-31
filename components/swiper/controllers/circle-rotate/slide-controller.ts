import type { Composition, VFXItem as PlayerVFXItem } from '@galacean/effects';
import { assertExist } from '@galacean/effects';
import { EffectComponent, math as EffectsMath } from '@galacean/effects';
import type { SwiperData } from '../../data/swiper-data';
import { lerp } from '@galacean/effects-components';

export class SlideController {
  item: PlayerVFXItem;
  centerItem?: PlayerVFXItem;
  slideIndex = 0;
  slideCount = 0;
  videoUrl = '';
  composition: Composition;
  positionY = 0;
  options: SwiperData;
  radius = 0;
  initRotationY = 0;
  static initRotationX = -25;
  initQuaternion: EffectsMath.Quaternion;
  slideRotateAngle = 0;
  slideParkRotationRatio: number[] = [];
  progressInSlide = 0;

  constructor (
    item: PlayerVFXItem,
    centerItem: PlayerVFXItem | undefined,
    slideIndex: number,
    slideCount: number,
    videoUrl: string,
    composition: Composition,
    options: SwiperData,
    slideRotateAngle: number,
    slideParkRotationRatio: number[],
  ) {
    this.item = item;
    this.centerItem = centerItem;
    this.slideIndex = slideIndex;
    this.slideCount = slideCount;
    this.videoUrl = videoUrl;
    this.composition = composition;
    this.options = options;
    this.radius = options.radius;
    this.initRotationY = 0;
    this.slideRotateAngle = slideRotateAngle;
    this.slideParkRotationRatio = slideParkRotationRatio;
  }

  init () {
    const startSlideRotation = 0;

    this.updatePosition();
    this.item.setRotation(0, this.initRotationY, 0);
    this.initQuaternion = this.item.transform.getQuaternion().clone();
    const { material } = this.item.getComponent(EffectComponent);

    material.setFloat('_Angle', startSlideRotation);
    material.setVector4('_AxisPosition', new EffectsMath.Vector4(0, 0, -(2.2 + this.slideIndex * 0.2), 0));
  }

  updateCenterRotation (progressInSlide: number, progressInTotal: number, speed?: number) {
    if (speed === undefined) { // fastPlay快速滑动使用线性
      progressInSlide = this.easeProgress(progressInSlide);
    }
    this.progressInSlide = progressInSlide;
    let progress = 0;
    const piece = 1 / this.slideCount;
    let index = (Math.floor(progressInTotal / piece + Number.EPSILON) - this.slideIndex + this.slideCount) % this.slideCount;

    if (progressInSlide === 1 || progressInSlide === -1) {
      index--;
    }
    const [min, max] = [this.slideParkRotationRatio[index], this.slideParkRotationRatio[index + 1]];

    progress = (progressInSlide <= 0 ? min : max) + (max - min) * -progressInSlide;
    assertExist(this.centerItem);
    const { rotation } = this.centerItem.transform;

    this.centerItem.setRotation(SlideController.initRotationX, 360 * progress, rotation.z);
  }

  easeProgress (progress: number) {
    return progress;
  }

  updatePosition () {
    const slideIndex = 0;
    const initRotationY = (360 - (slideIndex * 360) / this.slideCount + 90);
    const d = this.radius + slideIndex * 0.1;
    const x = d * Math.cos((Math.PI * 2 * initRotationY) / 360);
    const z = d * Math.sin((Math.PI * 2 * initRotationY) / 360);

    this.item.setPosition(x, this.positionY, z);
  }

  updateAngle (value: number) {
    const component = this.item.getComponent(EffectComponent);

    component.material.setFloat('_Angle', value);
  }

  updateRadius (value: number) {
    this.radius = value;
    this.updatePosition();
  }

  updateScale (value: number) {
    this.item.setScale(value, value, value);
  }

  updateBlendFactor (value: number) {
    const component = this.item.getComponent(EffectComponent);

    component.material.setFloat('_BlendFactor', value);
  }

  updateAxisZ (value: number) {
    const component = this.item.getComponent(EffectComponent);

    component.material.setVector4('_AxisPosition', new EffectsMath.Vector4(0, 0, value, 0));
  }

  get currentAngle () {
    const component = this.item.getComponent(EffectComponent);

    return component.material.getFloat('_Angle') ?? this.slideRotateAngle;
  }

  async fromRotateToAlign (progress: number, toQuaternion: number[]) {
    const from = this.initQuaternion.clone();
    const to = new EffectsMath.Quaternion(...toQuaternion);
    const toAngle = this.currentAngle;
    const fromAngle = this.slideRotateAngle;
    const toBlendFactor = 0;
    const fromBlendFactor = 1;
    const quat = from.slerp(to, progress);

    this.item.transform.setQuaternion(quat.x, quat.y, quat.z, quat.w);
    this.updateAngle(lerp(fromAngle, toAngle, progress));
    this.updateBlendFactor(lerp(fromBlendFactor, toBlendFactor, progress));
  }

}
