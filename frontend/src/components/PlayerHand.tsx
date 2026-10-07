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
  isSpectator?: boolean;
  finishPosition?: number | null;
  isRoundPause?: boolean;
}

export function PlayerHand({
  hand,
  currentRound,
  nextRoundStarterId,
  localPlayerId,
  onPlayCard,
  isSubmitting,
  isSpectator = false,
  finishPosition = null,
  isRoundPause = false,
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

  const isMyTurn = !isSpectator && !isRoundPause && (currentRound
    ? currentRound.currentTurnPlayerId === localPlayerId
    : nextRoundStarterId === localPlayerId);
  const ledSuit = currentRound?.ledSuit ?? null;
  const hasLedSuit = ledSuit ? hand.some((c) => c.suit === ledSuit) : false;

  const isPlayable = (card: CardType) => !isSpectator && !isRoundPause && isMyTurn && !isSubmitting && (!ledSuit || !hasLedSuit || card.suit === ledSuit);

  return (
    <div className="w-full flex flex-col items-center py-4">
      {isSpectator ? (
        <div className="mb-3 px-4 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold border bg-emerald-950/60 border-emerald-600 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.4)]">
          You Finished (Rank #{finishPosition ?? 1}) — Spectating
        </div>
      ) : (
        <div className={`mb-3 px-4 py-1 rounded-full text-xs uppercase tracking-wider font-semibold border transition-all duration-300 ${
          isMyTurn
            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.65)]'
            : 'bg-slate-800/50 border-slate-700 text-slate-400'
        }`}>
          Your Hand ({hand.length} cards)
        </div>
      )}
      <div ref={containerRef} className="w-full flex justify-center">
        {isSpectator || hand.length === 0 ? (
          <div className="text-xs text-slate-500 font-medium py-4">
            No cards remaining. You are observing the game.
          </div>
        ) : (
        <div
          className="relative"
          style={{ width: fanWidth, height: CARD_HEIGHT }}
        >
          {hand.map((card, index) => {
            const code = toCardCode(card);
            const playable = isPlayable(card);
            const classNames = playable
              ? 'hover:-translate-y-8 cursor-pointer'
              : 'brightness-70 grayscale-50 cursor-not-allowed';

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
        )}
      </div>
    </div>
  );
}
