import { Component } from '@galacean/effects';

export class RenderComponent extends Component {
  time = 0;
  callbacks: ((time: number) => void)[] = [];

  override onStart () {
    this.time = 0;
  }

  override onUpdate (dt: number) {
    super.onUpdate(dt);

    this.time += dt;
    if (this.callbacks.length) {
      const originLength = this.callbacks.length;

      this.callbacks.forEach(callback => {
        // 有可能调用完又注册了一个
        callback(this.time);
      });
      this.callbacks = this.callbacks.slice(originLength);
    }
  }

  requestAnimationFrame (callback: (time: number) => void) {
    this.callbacks.push(callback);
  }
}

export class RenderScheduler {
  component: RenderComponent | null = null;
  constructor (component: RenderComponent | null = null) {
    this.component = component;
  }
  requestAnimationFrame (callback: (time: number) => void) {
    if (this.component) {
      this.component.requestAnimationFrame(callback);
    } else {
      window.requestAnimationFrame(callback);
    }
  }
}
