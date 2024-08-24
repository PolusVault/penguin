import svgPieces from "../assets/pieces.svg";
import { Piece } from "../chess";

type Props = {
    piece: Piece;
    square: string;
    flippedCls: string;
    onSelectPiece(e: React.MouseEvent, piece: Piece): void;
};

export default function PieceComp({
    flippedCls,
    piece,
    square,
    onSelectPiece,
}: Props) {
    return (
        <svg
            onPointerDown={(e) => {
                onSelectPiece(e, piece);
            }}
            viewBox="0 0 45 45"
            className={`svg-piece sq-${square} ${flippedCls}`}
            key={square}
        >
            <use href={`${svgPieces}#piece-${piece.color}-${piece.type}`}></use>
        </svg>
    );
}
