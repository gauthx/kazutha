declare module '@heruka_urgyen/react-playing-cards' {
  import type { ComponentType, CSSProperties } from 'react';

  export interface CardProps {
    card: string;
    deckType?: string;
    height?: string;
    back?: boolean;
    className?: string;
    style?: CSSProperties;
  }

  const Card: ComponentType<CardProps>;
  export default Card;
}
