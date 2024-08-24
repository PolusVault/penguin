import { useState, useRef, useMemo, useEffect, Fragment } from "react";
import classNames from "classnames";
import {
    getBoard,
    getSquare,
    Piece,
    getMostRecentMove,
    TColor,
    TMove,
    clearMostRecentMove,
} from "../chess";
import PieceComp from "./Piece";
import PromotionWindow from "./PromotionWindow";

type DndState = {
    isDragging: boolean;
    draggingEl: HTMLElement | null;
    draggingElRect: DOMRect | null;
};

const initialDndState: DndState = {
    isDragging: false,
    draggingElRect: null,
    draggingEl: null,
};

function useDnd() {
    const [dnd, setDnd] = useState<DndState>(initialDndState);

    const startDragging = (htmlEl: HTMLElement) =>
        setDnd({
            isDragging: true,
            draggingEl: htmlEl,
            draggingElRect: htmlEl.getBoundingClientRect(),
        });

    const stopDragging = () => setDnd(initialDndState);

    return {
        dnd,
        startDragging,
        stopDragging,
    };
}

function clamp(value: number, min: number, max: number) {
    return Math.max(Math.min(value, max), min);
}

type Props = {
    isPlaying: boolean;
    isOver: boolean;
    flipped: boolean;
    sideToMove: TColor;
    myColor: TColor;
    playMove(m: TMove): void;
    getLegalMoves(sq: string): TMove[];
};

export default function Board({
    isPlaying,
    isOver,
    flipped,
    myColor,
    sideToMove,
    playMove,
    getLegalMoves,
}: Props) {
    const { dnd, startDragging, stopDragging } = useDnd();

    const [isAwaitingPromotion, setIsPromoting] = useState(false);
    const [isEventFinished, setEventFinished] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<Piece>();
    const [hasAlreadySelected, setHasAlreadySelected] = useState(false);
    const legalMoves = useMemo(
        () => (selectedPiece ? getLegalMoves(selectedPiece.square) : []),
        [selectedPiece]
    );
    const moveRef = useRef<TMove>();
    const boardEl = useRef<HTMLDivElement>(null);
    const hoverSquareRef = useRef<HTMLDivElement>(null);

    const flippedCls = classNames({ flipped });
    const legalSquareIndicatorCls = "legal-square-indicator";

    useEffect(() => {
        let hasMoved = false;

        const onDrag = (e: MouseEvent) => {
            if (!dnd.isDragging) return;

            hasMoved = true;

            const boardRect = boardEl.current!.getBoundingClientRect();
            const pieceRect = dnd.draggingElRect!;

            const x = clamp(e.clientX - boardRect!.left, 0, boardRect!.width);
            const y = clamp(e.clientY - boardRect!.top, 0, boardRect!.height);

            const pieceX = Math.floor(x - pieceRect.width / 2);
            const pieceY = Math.floor(y - pieceRect.height / 2);

            dnd.draggingEl!.style.transform = `translate(${pieceX}px, ${pieceY}px)`;

            const file = clamp(Math.floor(x / pieceRect.width), 0, 7);
            const rank = clamp(8 - Math.floor(y / pieceRect.height), 1, 8);
            const to = `${
                flipped
                    ? String.fromCharCode(201 - (97 + file))
                    : String.fromCharCode(97 + file)
            }${flipped ? 9 - rank : rank}`;

            moveRef.current!.to = to;
            hoverSquareRef.current!.className = `hover-square border-4 border-slate-300 sq-${to} ${flippedCls}`;
        };

        const onDrop = () => {
            if (!dnd.isDragging) return;

            dnd.draggingEl!.classList.toggle("dragging");
            dnd.draggingEl!.removeAttribute("style");

            hoverSquareRef.current!.removeAttribute("style");
            hoverSquareRef.current!.className = "hover-square";

            const move = moveRef.current!;

            if (hasAlreadySelected && move.to === move.from) {
                resetState();
            } else {
                if (hasMoved && move.to !== move.from) {
                    handleMove(move);
                    setEventFinished(true);
                }
            }

            stopDragging();
        };

        document.addEventListener("pointermove", onDrag);
        document.addEventListener("pointerup", onDrop);

        return () => {
            document.removeEventListener("pointermove", onDrag);
            document.removeEventListener("pointerup", onDrop);
        };
    }, [dnd.isDragging]);

    useEffect(() => {
        if (!boardEl.current) return;

        const onBoardClick = (e: MouseEvent) => {
            if (!selectedPiece) return;

            if ((e.target as HTMLElement)?.classList.contains("chess-board")) {
                resetState();
            }
        };

        boardEl.current!.addEventListener("pointerdown", onBoardClick);

        return () => {
            if (!boardEl.current) return;
            boardEl.current!.removeEventListener("pointerdown", onBoardClick);
        };
    }, [selectedPiece]);

    useEffect(() => {
        return () => {
            clearMostRecentMove();
        };
    }, []);

    const resetState = () => {
        setSelectedPiece(undefined);
        setHasAlreadySelected(false);
        setEventFinished(false);
        setIsPromoting(false);
        moveRef.current = undefined;
    };

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

    const handleMove = (move: TMove) => {
        if (!selectedPiece) return;

        const isLegal = isMoveLegal(move);

        if (isLegal && isLegal.is_also_promotion) {
            moveRef.current = move;
            setIsPromoting(true);
        } else if (isLegal && !isLegal.is_also_promotion) {
            try {
                playMove(move);
                resetState();
            } catch (e: any) {
                throw new Error(e.message);
            }
        } else {
            setHasAlreadySelected(false);
            setEventFinished(false);
            setIsPromoting(false);
            moveRef.current = undefined;
        }
    };

    const onSelectPiece = (e: React.MouseEvent, piece: Piece) => {
        if (isPlaying && myColor != piece.color) return;
        if (sideToMove !== piece.color) {
            resetState();
            return;
        }
        if (isOver) return;

        // TODO: is there a better way?
        if (
            selectedPiece &&
            selectedPiece.type === piece.type &&
            selectedPiece.color === piece.color &&
            selectedPiece.file === piece.file &&
            selectedPiece.rank === piece.rank &&
            selectedPiece.square === piece.square
        ) {
            setHasAlreadySelected(true);
        }

        setSelectedPiece(piece);
        setEventFinished(false);

        moveRef.current = {
            from: piece.square,
            to: piece.square,
        };

        const boardRect = boardEl.current!.getBoundingClientRect();
        const pieceRect = e.currentTarget.getBoundingClientRect();

        startDragging(e.currentTarget as HTMLElement);

        const boardx = e.clientX - boardRect!.left;
        const boardy = e.clientY - boardRect!.top;

        let file = clamp(Math.floor(boardx / pieceRect.width), 0, 7);
        let rank = clamp(8 - Math.floor(boardy / pieceRect.height), 1, 8);

        hoverSquareRef.current!.style.visibility = "visible";
        hoverSquareRef.current!.classList.toggle(
            `sq-${String.fromCharCode(97 + file)}${rank}`
        );

        // snap the center of the piece to the cursor
        let newTranslateX = boardx - pieceRect.width / 2;
        let newTranslateY = boardy - pieceRect.height / 2;

        (
            e.currentTarget as HTMLElement
        ).style.transform = `translate(${newTranslateX}px, ${newTranslateY}px)`;
        e.currentTarget.classList.toggle("dragging");
    };

    const onSelectPromotionPiece = (color: TColor, type: string) => {
        if (!moveRef.current) return;

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
            resetState();
        } catch (e: any) {
            // console.error(e);
            throw new Error(e.message);
        }

        closePromotionWindow();
    };

    const closePromotionWindow = () => {
        resetState();
    };

    const renderPieces = (): JSX.Element[] => {
        let pieces = [];

        for (const piece of getBoard()) {
            if (!piece) continue;

            let square = getSquare(piece);
            pieces.push(
                <PieceComp
                    piece={piece}
                    square={square}
                    key={square}
                    flippedCls={flippedCls}
                    onSelectPiece={onSelectPiece}
                />
            );
        }

        return pieces;
    };

    return (
        <div className="chess-board-container">
            <div className={`chess-board ${flippedCls}`} ref={boardEl}>
                {renderPieces()}

                {isAwaitingPromotion && isEventFinished && (
                    <PromotionWindow
                        square={`sq-${moveRef.current?.to}`}
                        closePromotionWindow={closePromotionWindow}
                        onSelectPromotionPiece={onSelectPromotionPiece}
                        color={sideToMove}
                        flipped={flipped}
                    />
                )}

                <div
                    ref={hoverSquareRef}
                    className="hover-square border-4 border-slate-300"
                ></div>

                {selectedPiece && (
                    <LegalSquareIndicators
                        legalMoves={legalMoves}
                        flippedCls={flippedCls}
                        legalSquareIndicatorCls={legalSquareIndicatorCls}
                        handleMove={handleMove}
                        finishEvent={() => setEventFinished(true)}
                    />
                )}

                {getMostRecentMove() && (
                    <RecentMoveHighlight
                        move={getMostRecentMove()!}
                        flippedCls={flippedCls}
                    />
                )}

                {!isPlaying && (
                    <div className="gator sq-e1">
                        <span className="noselect">🐊</span>
                    </div>
                )}

                <Coordinates flipped={flipped} />
            </div>
        </div>
    );
}

type LegalSquareIndicatorsProps = {
    legalMoves: TMove[];
    flippedCls: string;
    legalSquareIndicatorCls: string;
    handleMove(move: TMove): void;
    finishEvent(): void;
};

function LegalSquareIndicators({
    legalMoves,
    flippedCls,
    legalSquareIndicatorCls,
    handleMove,
    finishEvent,
}: LegalSquareIndicatorsProps) {
    return legalMoves.map((m) => (
        <div
            className={`${legalSquareIndicatorCls} ${flippedCls} sq-${m.to} `}
            key={m.to + m.promotion_piece}
            onPointerDown={() => handleMove(m)}
            onPointerUp={finishEvent}
        >
            <div className="block rounded-full bg-slate-200 opacity-85 w-2"></div>
        </div>
    ));
}

type RecentMoveHighlightProps = {
    move: TMove;
    flippedCls: string;
};

function RecentMoveHighlight({ move, flippedCls }: RecentMoveHighlightProps) {
    return (
        <>
            <div
                className={`move-highlight sq-${move.from} ${flippedCls}`}
            ></div>
            <div className={`move-highlight sq-${move.to} ${flippedCls}`}></div>
        </>
    );
}

type CoordinatesProps = {
    flipped: boolean;
};

function Coordinates({ flipped }: CoordinatesProps) {
    return (
        <>
            {Array(8)
                .fill(null)
                .map((_, coord) => {
                    let file = String.fromCharCode(97 + coord);
                    let colorCls;

                    if (flipped) {
                        colorCls = (coord + 1) % 2 === 0 ? "light" : "dark";
                    } else {
                        colorCls = (coord + 1) % 2 === 0 ? "dark" : "light";
                    }

                    return (
                        <Fragment key={coord}>
                            <div
                                className={`file font-bold noselect sq-${file}${
                                    flipped ? "1" : "8"
                                } ${flipped && "flipped"} ${colorCls}`}
                            >
                                {file}
                            </div>

                            <div
                                className={`rank font-bold noselect sq-${
                                    flipped ? "h" : "a"
                                }${coord + 1} ${
                                    flipped && "flipped"
                                } ${colorCls}`}
                            >
                                {coord + 1}
                            </div>
                        </Fragment>
                    );
                })}
        </>
    );
}
