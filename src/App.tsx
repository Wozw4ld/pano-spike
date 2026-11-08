import { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
import { rooms, startRoom } from './tour';
import './App.css';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tourRef = useRef<VirtualTourPlugin | null>(null);
  const [current, setCurrent] = useState(startRoom);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      loadingTxt: 'Загрузка…',
      defaultZoomLvl: 30,
      navbar: ['zoom', 'caption', 'fullscreen'],
      plugins: [
        MarkersPlugin,
        VirtualTourPlugin.withConfig({
          positionMode: 'manual',
          renderMode: '3d',
          // plan нужен только нам, в плагин его не передаём
          nodes: rooms.map(({ plan: _plan, ...node }) => ({ ...node, caption: node.name })),
          startNodeId: startRoom,
        }),
      ],
    });

    const tour = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
    tourRef.current = tour;
    tour.addEventListener('node-changed', ({ node }) => setCurrent(node.id));

    // Клик по панораме — в консоль пишутся координаты для стрелок в tour.ts
    viewer.addEventListener('click', ({ data }) => {
      console.log(`yaw: ${data.yaw.toFixed(2)}, pitch: ${data.pitch.toFixed(2)}`);
    });

    return () => {
      tourRef.current = null;
      viewer.destroy();
    };
  }, []);

  const goTo = (id: string) => tourRef.current?.setCurrentNode(id);
  const currentRoom = rooms.find((r) => r.id === current);

  return (
    <div className="app">
      <div ref={containerRef} className="viewer" />

      <aside className="plan" aria-label="План квартиры">
        <h2>Вы здесь: {currentRoom?.name}</h2>
        <svg viewBox="0 0 200 130" role="img" aria-label="План квартиры">
          {rooms.map((r) => (
            <rect
              key={r.id}
              x={r.plan.x + 1}
              y={r.plan.y + 1}
              width={r.plan.w - 2}
              height={r.plan.h - 2}
              fill={r.id === current ? '#0f6e5c' : '#ffffff'}
              stroke="#15171a"
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onClick={() => goTo(r.id)}
            />
          ))}
        </svg>
        <div className="rooms">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              className={r.id === current ? 'active' : ''}
              onClick={() => goTo(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
