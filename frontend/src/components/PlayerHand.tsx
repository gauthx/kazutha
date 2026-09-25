import CardLib from '@heruka_urgyen/react-playing-cards';
import type { Card as CardType } from '@shared/types';
import { toCardCode } from '../utils/cardCode';

const Card = (CardLib as any).default || CardLib;

interface PlayerHandProps {
  hand: CardType[];
}

export function PlayerHand({ hand }: PlayerHandProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="mb-2 text-xs uppercase tracking-wider text-slate-400 font-semibold">
        Your Hand ({hand.length} cards)
      </div>
      <div className="flex max-w-full overflow-x-auto py-4 px-6 gap-2 sm:gap-3 justify-center items-center">
        {hand.map((card, index) => {
          const code = toCardCode(card);
          return (
            <div
              key={`${code}-${index}`}
              className="transition-transform hover:-translate-y-4 duration-200 cursor-pointer shadow-lg rounded-lg shrink-0 w-[86px] h-[120px] aspect-[5/7]"
            >
              <Card card={code} deckType="basic" height="120px" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
