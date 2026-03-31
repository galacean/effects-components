import type { SwiperController } from './swiper-controller';
import type { SwiperData } from '../data/swiper-data';
import type { Swiper } from '../swiper';
export const swiperControllerMap: Record<string, { new (options: SwiperData, swiper: Swiper): SwiperController }> = {};
