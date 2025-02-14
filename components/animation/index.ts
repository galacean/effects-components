import type {
  ItemBasicTransform, ItemLinearVelOverLifetime, spec, ValueGetter, VFXItem,
} from '@galacean/effects';
import {
  calculateTranslation, Component, createValueGetter, ensureVec3, math,
} from '@galacean/effects';

const tempRot = new math.Euler();
const tempSize = new math.Vector3(1, 1, 1);
const tempPos = new math.Vector3();

export class AnimationComponent extends Component {
  private playable = new TransformAnimationPlayable();

  override onStart (): void {
    this.playable.boundObject = this.item;
  }

  override onUpdate (dt: number): void {
    this.playable.processFrame();
    this.playable.time += dt / 1000;
  }

  play (clip: AnimationClipData) {
    this.playable.data = clip;
    this.playable.time = 0;
    this.playable.start();
  }
}

export interface AnimationClipData {
  /**
   * 元素大小变化属性
   */
  sizeOverLifetime?: spec.SizeOverLifetime,
  /**
   * 元素旋转变化属性
   */
  rotationOverLifetime?: spec.RotationOverLifetime,
  /**
   * 元素位置变化属性
   */
  positionOverLifetime?: spec.PositionOverLifetime,
}

class TransformAnimationPlayable {
  originalTransform?: ItemBasicTransform;
  protected sizeSeparateAxes = false;
  protected sizeXOverLifetime?: ValueGetter<number>;
  protected sizeYOverLifetime?: ValueGetter<number>;
  protected sizeZOverLifetime?: ValueGetter<number>;
  protected rotationOverLifetime?: {
    asRotation?: boolean,
    separateAxes?: boolean,
    enabled?: boolean,
    x?: ValueGetter<number>,
    y?: ValueGetter<number>,
    z?: ValueGetter<number>,
  };
  gravityModifier?: ValueGetter<number>;
  orbitalVelOverLifetime?: {
    x?: ValueGetter<number>,
    y?: ValueGetter<number>,
    z?: ValueGetter<number>,
    center: [x: number, y: number, z: number],
    asRotation?: boolean,
    enabled?: boolean,
  };
  speedOverLifetime?: ValueGetter<number>;
  linearVelOverLifetime?: ItemLinearVelOverLifetime;
  positionOverLifetime?: spec.PositionOverLifetime;
  gravity?: math.Vector3;
  direction?: math.Vector3;
  startSpeed?: number;
  data?: AnimationClipData;
  boundObject?: VFXItem;
  time = 0;

  private velocity?: math.Vector3;

  start (): void {
    const boundItem = this.boundObject;

    if (!boundItem) {
      return;
    }
    const { scale } = boundItem.transform;

    this.originalTransform = {
      position: boundItem.transform.position.clone(),
      rotation: boundItem.transform.getRotation().clone(),
      scale: new math.Vector3(scale.x, scale.y, scale.x),
    };
    const { positionOverLifetime, rotationOverLifetime, sizeOverLifetime } = this.data ?? {};

    if (
      positionOverLifetime &&
      Object.keys(positionOverLifetime).length !== 0
    ) {
      this.positionOverLifetime = positionOverLifetime;
      if (positionOverLifetime.path) {
        this.originalTransform.path = createValueGetter(
          positionOverLifetime.path,
        );
      }
      const linearVelEnable =
        positionOverLifetime.linearX ||
        positionOverLifetime.linearY ||
        positionOverLifetime.linearZ;

      if (linearVelEnable) {
        this.linearVelOverLifetime = {
          x:
            positionOverLifetime.linearX &&
            createValueGetter(positionOverLifetime.linearX),
          y:
            positionOverLifetime.linearY &&
            createValueGetter(positionOverLifetime.linearY),
          z:
            positionOverLifetime.linearZ &&
            createValueGetter(positionOverLifetime.linearZ),
          asMovement: positionOverLifetime.asMovement,
          enabled: !!linearVelEnable,
        };
      }

      const orbitalVelEnable =
        positionOverLifetime.orbitalX ||
        positionOverLifetime.orbitalY ||
        positionOverLifetime.orbitalZ;

      if (orbitalVelEnable) {
        this.orbitalVelOverLifetime = {
          x:
            positionOverLifetime.orbitalX &&
            createValueGetter(positionOverLifetime.orbitalX),
          y:
            positionOverLifetime.orbitalY &&
            createValueGetter(positionOverLifetime.orbitalY),
          z:
            positionOverLifetime.orbitalZ &&
            createValueGetter(positionOverLifetime.orbitalZ),
          center: ensureVec3(positionOverLifetime.orbCenter),
          asRotation: positionOverLifetime.asRotation,
          enabled: !!orbitalVelEnable,
        };
      }
      this.speedOverLifetime =
        positionOverLifetime.speedOverLifetime &&
        createValueGetter(positionOverLifetime.speedOverLifetime);
    }

    if (sizeOverLifetime) {
      if (sizeOverLifetime.separateAxes) {
        this.sizeSeparateAxes = true;
        this.sizeXOverLifetime = createValueGetter(sizeOverLifetime.x || 1);
        this.sizeYOverLifetime = createValueGetter(sizeOverLifetime.y || 1);
        this.sizeZOverLifetime = createValueGetter(sizeOverLifetime.z || 1);
      } else {
        this.sizeXOverLifetime = createValueGetter(sizeOverLifetime.size || 1);
      }
    }

    if (rotationOverLifetime) {
      this.rotationOverLifetime = {
        asRotation: rotationOverLifetime.asRotation,
        separateAxes: rotationOverLifetime.separateAxes,
        z: createValueGetter(rotationOverLifetime.z || 0),
      };
      if (rotationOverLifetime.separateAxes) {
        const rotLt = this.rotationOverLifetime;

        rotLt.x = createValueGetter(rotationOverLifetime.x || 0);
        rotLt.y = createValueGetter(rotationOverLifetime.y || 0);
      }
    }
    this.gravity = math.Vector3.fromArray(positionOverLifetime?.gravity || []);
    this.gravityModifier = createValueGetter(
      positionOverLifetime?.gravityOverLifetime ?? 0,
    );
    this.direction = positionOverLifetime?.direction
      ? math.Vector3.fromArray(positionOverLifetime.direction).normalize()
      : new math.Vector3();
    this.startSpeed = positionOverLifetime?.startSpeed || 0;

    this.velocity = this.direction.clone();
    this.velocity.multiply(this.startSpeed);
  }

  processFrame (): void {
    this.sampleAnimation();
  }

  /**
   * 应用时间轴K帧数据到对象
   */
  private sampleAnimation () {
    const boundItem = this.boundObject;

    if (!boundItem) {
      return;
    }

    const { duration } = boundItem;
    const life = math.clamp(this.time / duration, 0, 1);

    if (this.sizeXOverLifetime) {
      tempSize.x = this.sizeXOverLifetime.getValue(life);
      if (this.sizeSeparateAxes && this.sizeYOverLifetime && this.sizeZOverLifetime) {
        tempSize.y = this.sizeYOverLifetime.getValue(life);
        tempSize.z = this.sizeZOverLifetime.getValue(life);
      } else {
        tempSize.z = tempSize.x;
        tempSize.y = tempSize.x;
      }
      const { x = 1, y = 1, z = 1 } = this.originalTransform?.scale ?? {};

      boundItem.transform.setScale(
        tempSize.x * x,
        tempSize.y * y,
        tempSize.z * z,
      );
    }

    if (this.rotationOverLifetime) {
      const func = (v?: ValueGetter<number>) => {
        if (!v) { return 0; }

        return this.rotationOverLifetime?.asRotation
          ? v.getValue(life)
          : v.getIntegrateValue(0, life, duration);
      };
      const incZ = func(this.rotationOverLifetime.z);
      const { separateAxes } = this.rotationOverLifetime;

      tempRot.x = separateAxes ? func(this.rotationOverLifetime.x) : 0;
      tempRot.y = separateAxes ? func(this.rotationOverLifetime.y) : 0;
      tempRot.z = incZ;

      if (this.originalTransform) {
        const rot = tempRot.addEulers(this.originalTransform.rotation, tempRot);

        boundItem.transform.setRotation(rot.x, rot.y, rot.z);
      }
    }

    if (this.positionOverLifetime) {
      const pos = tempPos;

      if (this.gravity && this.originalTransform && this.velocity) {
        calculateTranslation(
          pos,
          this,
          this.gravity,
          this.time,
          duration,
          this.originalTransform.position,
          this.velocity,
        );
      }

      if (this.originalTransform?.path) {
        pos.add(this.originalTransform.path.getValue(life));
      }

      boundItem.transform.setPosition(pos.x, pos.y, pos.z);
    }
  }
}
