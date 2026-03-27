import type { VFXItem as PlayerVFXItem } from '@galacean/effects';
import { EffectComponent } from '@galacean/effects';
import { Component } from '@galacean/effects';

export class SwiperItemSorter extends Component {
  override onStart (): void {
    this.sortChildrenByZ();
  }

  override onUpdate (): void {
    this.sortChildrenByZ();
  }

  private sortChildrenByZ (): void {
    if (!this.item) {
      return;
    }
    sortChildrenByZ(this.item);
  }
}

export function sortChildrenByZ (item: PlayerVFXItem) {
  const children = getEffectChildren(item);

  if (!children || children.length === 0) {
    return;
  }

  children.forEach(child => {
    const { material } = child.getComponent(EffectComponent);

    material.depthMask = false;
  });

  const childrenWithZ: { item: PlayerVFXItem, z: number }[] = [];

  // 收集所有子元素及其 z 坐标
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const worldPos = child.transform.getWorldPosition();

    if (childrenWithZ[i]) {
      childrenWithZ[i].item = child;
      childrenWithZ[i].z = worldPos.z;
    } else {
      childrenWithZ.push({ item: child, z: worldPos.z });
    }
  }

  const renderOrderList = childrenWithZ.map(item => item.item.renderOrder);

  renderOrderList.sort((a, b) => a - b);
  // 按 z 坐标升序排序（z 值越小，renderOrder 越小，越先渲染）
  childrenWithZ.sort((a, b) => a.z - b.z);

  // 设置 renderOrder
  for (let i = 0; i < childrenWithZ.length; i++) {
    childrenWithZ[i].item.renderOrder = renderOrderList[i];

    childrenWithZ[i].item.setVisible(false);
    childrenWithZ[i].item.setVisible(true);
  }
}

function getEffectChildren (item: PlayerVFXItem, effectItems: PlayerVFXItem[] = []): PlayerVFXItem[] {
  item.children.forEach(child => {
    if (child.type === 'effect') {
      effectItems.push(child);
    } else {
      getEffectChildren(child, effectItems);
    }
  });

  return effectItems;
}
