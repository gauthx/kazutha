import { useLayoutEffect, useRef, useState } from 'react';
import CardLib from '@heruka_urgyen/react-playing-cards';
import type { Card as CardType, RoundSnapshot } from '@shared/types';
import { toCardCode } from '../utils/cardCode';
import { computePeek } from '../utils/handLayout';

const Card = (CardLib as any).default || CardLib;

const CARD_WIDTH = 86;
const CARD_HEIGHT = 120;

interface PlayerHandProps {
  hand: CardType[];
  currentRound: RoundSnapshot | null;
  nextRoundStarterId?: string | null;
  localPlayerId: string;
  onPlayCard?: (card: CardType) => void;
  isSubmitting?: boolean;
}

export function PlayerHand({
  hand,
  currentRound,
  nextRoundStarterId,
  localPlayerId,
  onPlayCard,
  isSubmitting,
}: PlayerHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1280);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const peek = computePeek(hand.length, containerWidth, CARD_WIDTH);
  const fanWidth = hand.length === 0 ? 0 : CARD_WIDTH + (hand.length - 1) * peek;

  const isMyTurn = currentRound
    ? currentRound.currentTurnPlayerId === localPlayerId
    : nextRoundStarterId === localPlayerId;
  const ledSuit = currentRound?.ledSuit ?? null;
  const hasLedSuit = ledSuit ? hand.some((c) => c.suit === ledSuit) : false;

  const isPlayable = (card: CardType) => {
    if (!isMyTurn || isSubmitting) return false;
    if (!ledSuit) return true;
    if (hasLedSuit) return card.suit === ledSuit;
    return true;
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      <div className="mb-3 text-xs uppercase tracking-wider text-slate-400 font-semibold">
        Your Hand ({hand.length} cards)
      </div>
      <div ref={containerRef} className="w-full flex justify-center">
        <div
          className="relative"
          style={{ width: fanWidth, height: CARD_HEIGHT }}
        >
          {hand.map((card, index) => {
            const code = toCardCode(card);
            const playable = isPlayable(card);
            const classNames = playable
              ? 'hover:-translate-y-8 cursor-pointer'
              : 'opacity-40 cursor-not-allowed';

            return (
              <div
                key={`${code}-${index}`}
                className={`absolute transition-transform duration-200 shadow-lg rounded-lg ${classNames}`}
                style={{
                  left: index * peek,
                  zIndex: index,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                }}
                onClick={() => playable && onPlayCard && onPlayCard(card)}
              >
                <Card card={code} deckType="basic" height={`${CARD_HEIGHT}px`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
