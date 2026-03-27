import type { Engine, TextureOptionsBase } from '@galacean/effects';
import { glContext } from '@galacean/effects';
import { generateGUID, isAndroid, Texture, TextureSourceType } from '@galacean/effects';
import { sleep } from '../../common/utils';

export async function textureFromVideo (url: string, engine: Engine, videoSource?: { h264: string, h265: string }, options?: TextureOptionsBase, autoPlay?: boolean, maxWaitLoadSecond?: number, muted?: boolean) {
  const loadTask = loadVideo(url, videoSource, autoPlay, muted);

  if (maxWaitLoadSecond) {
    const value = await Promise.race([loadTask, sleep(maxWaitLoadSecond * 1000)]);

    if (!value) {
      throw new Error('setUpTexture load timeout');
    }
  }
  const video = await loadTask;
  const texture = Texture.create(engine, {
    sourceType: TextureSourceType.video,
    video,
    id: generateGUID(),
    flipY: true,
    magFilter: glContext.LINEAR,
    minFilter: glContext.LINEAR,
    ...options,
  });

  texture.initialize();

  return texture;
}

function loadVideo (url: string | MediaProvider, videoSource?: { h264: string, h265: string }, autoPlay?: boolean, muted?: boolean) {
  muted ??= true;
  const video = document.createElement('video');
  let source2: HTMLSourceElement | null = null;

  if (videoSource) {
    const source1 = document.createElement('source');

    source2 = document.createElement('source');
    source1.src = videoSource.h265;
    source2.src = videoSource.h264;
    video.appendChild(source1);
    video.appendChild(source2);
  } else {
    if (typeof url === 'string') {
      video.src = url;
    } else {
      video.srcObject = url;
    }
  }
  video.crossOrigin = 'anonymous';
  video.muted = muted;
  video.preload = 'auto';
  video.loop = true;
  if (isAndroid()) {
    video.setAttribute('renderer', 'standard');
  }
  video.setAttribute('playsinline', 'playsinline');

  return new Promise<HTMLVideoElement>((resolve, reject) => {
    video.addEventListener('loadeddata', () => {
      resolve(video);
    }, { once: true });

    video.addEventListener('error', () => {
      reject('Load video fail.');
    });

    if (source2) {
      source2.addEventListener('error', error => {
        console.error('视频source加载失败', error);
        reject(error);
      });
    }

    // play触发加载
    video.play().then(() => {
      if (!autoPlay) {
        video.pause();
      }
      resolve(video);
    }).catch(e => {
      reject(e);
    });

  });
}

export function disposeTexture (texture: Texture) {
  texture.dispose();
  texture.initialize = () => {
    console.error('texture has been disposed');
  };
  // @ts-expect-error
  texture.update = () => {};
  // @ts-expect-error
  texture._url = '';
  texture.dispose = () => {};
  // @ts-expect-error
  if (texture.source?.video) {
    // @ts-expect-error
    texture.source.video.pause?.();
    // @ts-expect-error
    texture.source.video = null;
  }
}
