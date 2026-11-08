import type { VirtualTourNode } from '@photo-sphere-viewer/virtual-tour-plugin';

// Положение комнаты на мини-плане (в координатах viewBox 0 0 200 130)
export type PlanRect = { x: number; y: number; w: number; h: number };

export type Room = VirtualTourNode & { name: string; plan: PlanRect };

// Панорамы лежат в public/panos/.
// yaw/pitch — направление стрелки перехода в радианах.
// Реальные значения узнаешь кликом по панораме: они выводятся в консоль браузера.
export const rooms: Room[] = [
  {
    id: 'living',
    name: 'Гостиная',
    panorama: '/panos/living.jpg',
    plan: { x: 0, y: 0, w: 110, h: 75 },
    links: [
      { nodeId: 'kitchen', position: { yaw: 1.57, pitch: -0.15 } },
      { nodeId: 'bedroom', position: { yaw: -1.57, pitch: -0.15 } },
      { nodeId: 'hall', position: { yaw: 3.14, pitch: -0.15 } },
    ],
  },
  {
    id: 'kitchen',
    name: 'Кухня',
    panorama: '/panos/kitchen.jpg',
    plan: { x: 0, y: 75, w: 70, h: 55 },
    links: [{ nodeId: 'living', position: { yaw: -1.57, pitch: -0.15 } }],
  },
  {
    id: 'bedroom',
    name: 'Спальня',
    panorama: '/panos/bedroom.jpg',
    plan: { x: 110, y: 0, w: 90, h: 75 },
    links: [{ nodeId: 'living', position: { yaw: 1.57, pitch: -0.15 } }],
  },
  {
    id: 'hall',
    name: 'Прихожая',
    panorama: '/panos/hall.jpg',
    plan: { x: 70, y: 75, w: 130, h: 55 },
    links: [{ nodeId: 'living', position: { yaw: 0, pitch: -0.15 } }],
  },
];

export const startRoom = 'living';
