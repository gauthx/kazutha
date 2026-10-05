import { useLayoutEffect, useRef, useState } from 'react';
import CardLib from '@heruka_urgyen/react-playing-cards';
import type { PlayerPublic } from '@shared/types';
import { computePeek } from '../utils/handLayout';

const Card = (CardLib as any).default || CardLib;

const CARD_WIDTH = 50;
const CARD_HEIGHT = 70;
const NATURAL_PEEK = 20;

interface OpponentHandProps {
  player: PlayerPublic;
  position?: 'top' | 'left' | 'right';
  isCurrentTurn?: boolean;
}

export function OpponentHand({ player, position = 'top', isCurrentTurn = false }: OpponentHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayCount = Math.min(player.cardCount, 8);
  const peek = Math.min(
    NATURAL_PEEK,
    computePeek(displayCount, containerWidth, CARD_WIDTH),
  );
  const fanWidth = displayCount === 0 ? 0 : CARD_WIDTH + (displayCount - 1) * peek;

  return (
    <div className={`flex flex-col items-center ${position === 'left' || position === 'right' ? 'w-48' : ''}`}>
      <div className={`flex items-center gap-2 mb-2 bg-slate-800/80 px-3 py-1 rounded-full border transition-all duration-300 ${
        isCurrentTurn
          ? 'border-indigo-500 shadow-[0_0_14px_rgba(99,102,241,0.65)]'
          : 'border-slate-700'
      }`}>
        <span
          className={`h-2 w-2 rounded-full ${
            player.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        <span className="text-xs font-semibold text-slate-200">
          {player.displayName}
        </span>
        <span className="text-xs text-indigo-400 font-mono">
          ({player.cardCount})
        </span>
      </div>

      <div ref={containerRef} className="py-1">
        <div className="relative" style={{ width: fanWidth, height: CARD_HEIGHT }}>
          {Array.from({ length: displayCount }).map((_, index) => (
            <div
              key={index}
              className="absolute shadow-md"
              style={{
                left: index * peek,
                zIndex: index,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
              }}
            >
              <Card card="Ah" deckType="basic" height={`${CARD_HEIGHT}px`} back />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
