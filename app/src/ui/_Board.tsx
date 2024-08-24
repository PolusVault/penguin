import { useRef, useEffect, useState, useMemo } from "react";
import classNames from "classnames";
import {
    getBoard,
    getSquare,
    // Piece as TPiece,
} from "../chess";
import { useDnD } from "../stores/dragAndDrop";
import Piece from "./Piece";
import { TMove, TColor } from "../chess";
import PromotionWindow from "./PromotionWindow";

type Props = {
    isPlaying: boolean;
    isOver: boolean;
    flipped: boolean;
    sideToMove: TColor;
    myColor: TColor;
    playMove(m: TMove): void;
    getLegalMoves(sq: string): TMove[];
};

function clamp(value: number, min: number, max: number) {
    return Math.max(Math.min(value, max), min);
}

// function invariant() {}

export default function Board({
    isPlaying,
    isOver,
    flipped,
    myColor,
    sideToMove,
    playMove,
    getLegalMoves,
}: Props) {
    const boardEl = useRef<HTMLDivElement>(null);
    const moveRef = useRef<TMove>();
    const hoverSquareRef = useRef<HTMLDivElement>(null);

    const dnd = useDnD((state) => ({ ...state }));

    const [isAwaitingPromotion, setIsPromoting] = useState(false);
    const [selectedPieceSq, setSelectedPieceSq] = useState<string>();
    const [temp, setTemp] = useState(false);
    const legalMoves = useMemo(
        () => (selectedPieceSq ? getLegalMoves(selectedPieceSq) : []),
        [selectedPieceSq]
    );

    const flippedCls = classNames({ flipped });

    useEffect(() => {
        let hasMoved = false;

        // dragging
        const onPointerMove = (e: MouseEvent) => {
            if (!dnd.isDragging) return;
            // TODO: hate this, is there a better way of handling these refs?
            if (
                !moveRef.current ||
                !boardEl.current ||
                !dnd.draggingElRect ||
                !dnd.draggingEl
            )
                throw new Error("dragging error, bad state");
            dnd.startMoving();
            hasMoved = true;

            const boardRect = boardEl.current.getBoundingClientRect();
            const pieceRect = dnd.draggingElRect;

            const x = clamp(e.clientX - boardRect.left, 0, boardRect.width);
            const y = clamp(e.clientY - boardRect.top, 0, boardRect.height);

            const pieceX = Math.floor(x - pieceRect.width / 2);
            const pieceY = Math.floor(y - pieceRect.height / 2);

            dnd.draggingEl.style.transform = `translate(${pieceX}px, ${pieceY}px)`;

            const file = clamp(Math.floor(x / pieceRect.width), 0, 7);
            const rank = clamp(8 - Math.floor(y / pieceRect.height), 1, 8);
            const to = `${
                flipped
                    ? String.fromCharCode(201 - (97 + file))
                    : String.fromCharCode(97 + file)
            }${flipped ? 9 - rank : rank}`;

            moveRef.current.to = to;
            hoverSquareRef.current!.className = `hover-square border-4 border-slate-300 sq-${to} ${flippedCls}`;
        };

        // on drop
        const onPointerUp = () => {
            if (!dnd.isDragging) return;
            if (!moveRef.current) return;
            if (!dnd.draggingEl || !hoverSquareRef.current) return;

            dnd.draggingEl.classList.toggle("dragging");
            dnd.draggingEl.removeAttribute("style");

            hoverSquareRef.current.removeAttribute("style");
            hoverSquareRef.current.className = "hover-square";

            if (
                temp &&
                (!moveRef.current.to || moveRef.current.to === selectedPieceSq)
            ) {
                setSelectedPieceSq(undefined);
                setTemp(false);
                moveRef.current = undefined;
            } else {
                if (hasMoved) {
                    handleMove(moveRef.current.to!);
                }
            }

            dnd.stopDragging();
        };

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);

        return () => {
            document.removeEventListener("pointermove", onPointerMove);
            document.removeEventListener("pointerup", onPointerUp);
        };
    }, [dnd.isDragging, dnd.hasMoved, isAwaitingPromotion]);

    const isMoveLegal = (
        move: TMove
    ): { is_also_promotion: boolean } | undefined => {
        let count = legalMoves.filter(
            (m) => m.from == move.from && m.to == move.to
        ).length;

        if (count == 1) {
            return { is_also_promotion: false };
        } else if (count > 1) {
            return { is_also_promotion: true };
        } else {
            return undefined;
        }
    };

    const handleMove = (to: string) => {
        if (!selectedPieceSq) return;
        let move: TMove = {
            from: selectedPieceSq,
            to,
        };

        const isLegal = isMoveLegal(move);

        if (isLegal && isLegal.is_also_promotion) {
            setIsPromoting(true);
        } else if (isLegal && !isLegal.is_also_promotion) {
            try {
                playMove(move);
            } catch (e: any) {
                throw new Error(e.message);
            }

            setSelectedPieceSq(undefined);
            setTemp(false);
            moveRef.current = undefined;
        }
    };

    const onStartDragging = (
        e: React.MouseEvent,
        from: string,
        color: string
    ) => {
        e.preventDefault();

        if (isPlaying && myColor != color) return;
        if (isOver) return;
        if (!boardEl.current || !moveRef.current || !hoverSquareRef.current) {
            throw new Error("board not inialized correctly");
        }

        moveRef.current = {
            from,
        };

        const boardRect = boardEl.current.getBoundingClientRect();
        const pieceRect = e.currentTarget.getBoundingClientRect();

        const boardx = e.clientX - boardRect.left;
        const boardy = e.clientY - boardRect.top;

        let file = clamp(Math.floor(boardx / pieceRect.width), 0, 7);
        let rank = clamp(8 - Math.floor(boardy / pieceRect.height), 1, 8);

        hoverSquareRef.current.style.visibility = "visible";
        hoverSquareRef.current.classList.toggle(
            `sq-${String.fromCharCode(97 + file)}${rank}`
        );

        // snap the center of the piece to the cursor
        let newTranslateX = boardx - pieceRect.width / 2;
        let newTranslateY = boardy - pieceRect.height / 2;

        (
            e.currentTarget as HTMLElement
        ).style.transform = `translate(${newTranslateX}px, ${newTranslateY}px)`;
        e.currentTarget.classList.toggle("dragging");
        dnd.setDraggingEl(e.currentTarget as HTMLElement);
    };

    const onSelectPiece = (sq: string, color: Color) => {
        if (isPlaying && myColor != color) return;

        if (selectedPieceSq) {
            setTemp(true);
        }
        setSelectedPieceSq(sq);
    };

    const onSelectPromotionPiece = (color: string, type: string) => {
        try {
            switch (type) {
                case "knight":
                    moveRef.current.promotion_piece = "n";
                    break;
                case "queen":
                case "rook":
                case "bishop":
                    moveRef.current.promotion_piece =
                        color === "w" ? type[0].toUpperCase() : type[0];
            }

            playMove(moveRef.current);
            moveRef.current = {};
        } catch (e: any) {
            // console.error(e);
            throw new Error(e.message);
        }

        closePromotionWindow();
    };

    const closePromotionWindow = () => {
        setIsPromoting(false);
    };

    const renderPieces = (): JSX.Element[] => {
        let pieces = [];

        for (const piece of getBoard()) {
            if (!piece) continue;

            let square = getSquare(piece);
            pieces.push(
                <Piece
                    piece={piece}
                    square={square}
                    key={square}
                    flippedCls={flippedCls}
                    onStartDragging={onStartDragging}
                    onSelectPiece={onSelectPiece}
                />
            );
        }

        return pieces;
    };

    return (
        <div className={`chess-board ${flippedCls}`} ref={boardEl}>
            <PromotionWindow
                isAwaitingPromotion={isAwaitingPromotion}
                square={`sq-${moveRef.current.to}`}
                closePromotionWindow={closePromotionWindow}
                onSelectPromotionPiece={onSelectPromotionPiece}
                color={sideToMove}
                flipped={flipped}
            />
            <div
                ref={hoverSquareRef}
                className="hover-square border-4 border-slate-300"
            ></div>

            {selectedPieceSq && (
                <LegalSquareIndicators
                    sq={selectedPieceSq}
                    flippedCls={flippedCls}
                    getLegalMoves={getLegalMoves}
                    handleMove={handleMove}
                />
            )}

            {renderPieces()}

            {!isPlaying && (
                <div className="gator sq-e1">
                    <span>🐊</span>
                </div>
            )}
        </div>
    );
}

type LegalSquareIndicatorsProps = {
    sq: string;
    flippedCls: string;
    getLegalMoves(sq: string): TMove[];
    handleMove(to: string): void;
};

function LegalSquareIndicators({
    sq,
    flippedCls,
    getLegalMoves,
    handleMove,
}: LegalSquareIndicatorsProps) {
    const legalMoves = useMemo(() => getLegalMoves(sq), [sq]);

    // useEff

    return legalMoves.map((m) => (
        <div
            className={`highlight ${flippedCls} sq-${m.to!} block rounded-full bg-slate-200`}
            key={m.to}
            onPointerDown={() => handleMove(m.to!)}
        ></div>
    ));
}
