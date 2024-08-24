import pieces from "../assets/pieces.svg";
import { TColor } from "../chess";

type PromotionPieceProps = {
    color: TColor;
    type: string;
    onSelectPromotionPiece: (color: TColor, type: string) => void;
};

export function PromotionPiece({
    color,
    type,
    onSelectPromotionPiece,
}: PromotionPieceProps) {
    return (
        <svg
            viewBox="0 0 45 45"
            className={`promotion-piece`}
            onClick={() => onSelectPromotionPiece(color, type)}
        >
            <use href={`${pieces}#piece-${color}-${type}`}></use>
        </svg>
    );
}
