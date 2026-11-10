import { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
import { rooms, startRoom, type Room } from './Tour';
import './App.css';

// Приводит yaw к диапазону (-π, π]
const normalizeYaw = (yaw: number) => {
  const twoPi = Math.PI * 2;
  let normalized = yaw % twoPi;
  if (normalized > Math.PI) normalized -= twoPi;
  if (normalized <= -Math.PI) normalized += twoPi;
  return normalized;
};

const cloneRooms = (source: Room[]): Room[] =>
  source.map((room) => ({
    ...room,
    links: (room.links ?? []).map((link) => ({
      ...link,
      position: link.position ? { ...link.position } : link.position,
    })),
  }));

type EditMenu = { fromId: string; yaw: number; pitch: number; clientX: number; clientY: number };

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tourRef = useRef<VirtualTourPlugin | null>(null);
  const currentRef = useRef(startRoom);
  const editModeRef = useRef(false);

  const [current, setCurrent] = useState(startRoom);
  const [editMode, setEditMode] = useState(false);
  const [roomsState, setRoomsState] = useState<Room[]>(() => cloneRooms(rooms));
  const [menu, setMenu] = useState<EditMenu | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  const toggleEditMode = () => {
    if (editMode) setMenu(null);
    setEditMode((v) => !v);
  };

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
    tour.addEventListener('node-changed', ({ node }) => {
      currentRef.current = node.id;
      setCurrent(node.id);
    });

    // Клик по панораме: в режиме редактора открывает меню "Куда ведёт?"
    viewer.addEventListener('click', ({ data }) => {
      console.log(`yaw: ${data.yaw.toFixed(2)}, pitch: ${data.pitch.toFixed(2)}`);
      if (editModeRef.current) {
        setMenu({
          fromId: currentRef.current,
          yaw: data.yaw,
          pitch: data.pitch,
          clientX: data.clientX,
          clientY: data.clientY,
        });
      }
    });

    return () => {
      tourRef.current = null;
      viewer.destroy();
    };
  }, []);

  const goTo = (id: string) => tourRef.current?.setCurrentNode(id);
  const currentRoom = roomsState.find((r) => r.id === current);

  // Добавляет стрелку fromId -> toId и автоматически обратную toId -> fromId
  const addLink = (fromId: string, toId: string, yaw: number, pitch: number) => {
    const reverseYaw = normalizeYaw(yaw + Math.PI);

    setRoomsState((prev) => {
      const next = prev.map((room) => {
        if (room.id === fromId) {
          const links = (room.links ?? []).filter((l) => l.nodeId !== toId);
          links.push({ nodeId: toId, position: { yaw, pitch } });
          return { ...room, links };
        }
        if (room.id === toId) {
          const links = (room.links ?? []).filter((l) => l.nodeId !== fromId);
          links.push({ nodeId: fromId, position: { yaw: reverseYaw, pitch } });
          return { ...room, links };
        }
        return room;
      });

      const fromRoom = next.find((r) => r.id === fromId);
      const toRoom = next.find((r) => r.id === toId);
      if (fromRoom) tourRef.current?.updateNode({ id: fromId, links: fromRoom.links });
      if (toRoom) tourRef.current?.updateNode({ id: toId, links: toRoom.links });

      return next;
    });
  };

  const handlePickRoom = (toId: string) => {
    if (!menu) return;
    addLink(menu.fromId, toId, menu.yaw, menu.pitch);
    setMenu(null);
  };

  const handleExport = async () => {
    const json = JSON.stringify(roomsState, null, 2);
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="app">
      <div ref={containerRef} className="viewer" />

      <div className="toolbar">
        <button type="button" className={editMode ? 'active' : ''} onClick={toggleEditMode}>
          {editMode ? 'Редактор: Вкл' : 'Редактировать'}
        </button>
        <button type="button" onClick={handleExport}>
          {copied ? 'Скопировано!' : 'Экспорт'}
        </button>
        {editMode && <span className="hint">Кликните по панораме, чтобы задать переход</span>}
      </div>

      {menu && (
        <div className="menu-overlay" onClick={() => setMenu(null)}>
          <div
            className="menu"
            style={{ left: menu.clientX, top: menu.clientY }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-title">Куда ведёт?</div>
            {roomsState
              .filter((r) => r.id !== menu.fromId)
              .map((r) => (
                <button key={r.id} type="button" onClick={() => handlePickRoom(r.id)}>
                  {r.name}
                </button>
              ))}
          </div>
        </div>
      )}

      <aside className="plan" aria-label="План квартиры">
        <h2>Вы здесь: {currentRoom?.name}</h2>
        <svg viewBox="0 0 200 130" role="img" aria-label="План квартиры">
          {roomsState.map((r) => (
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
          {roomsState.map((r) => (
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
