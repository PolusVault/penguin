import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import classNames from "classnames";
import Board from "../ui/Board";
import { useGameState } from "../stores/gameState";
import {
    chess,
    onGameStatusChange,
    GameState,
    playMove,
    TMove,
    TColor,
    TCapture,
} from "../chess";
import PlayerInfo from "../ui/PlayerInfo";
import Modal from "../ui/Modal";
import pieces from "../assets/pieces.svg";

type Props = {
    leaveGame(): void;
    makeMove(move: TMove): void;
    onOpponentMove(cb: () => void): () => void;
};

type TGameStatus = {
    isOver: boolean;
    state: GameState;
    win?: boolean;
    lose?: boolean;
    draw?: boolean;
};

export default function Game({ onOpponentMove, makeMove, leaveGame }: Props) {
    const [sideToMove, setSideToMove] = useState(chess.turn() as TColor);
    const [gameStatus, setGameStatus] = useState<TGameStatus | null>(null);
    const [modal, setModal] = useState(false); // this is the modal to show the game status
    const { name, opponent, myColor, room_id, setJoinCode } = useGameState(
        (state) => ({
            ...state,
        })
    );

    useEffect(() => {
        function handleOpponentMove() {
            setSideToMove(chess.turn() as TColor);
        }

        function handleGameStatus(state: GameState, color: TColor) {
            if (state === GameState.Checkmate) {
                let status: { win?: boolean; lose?: boolean } = {};

                if (myColor === color) {
                    console.log("lost by " + GameState.Checkmate);
                    status.lose = true;
                } else {
                    console.log("won by " + GameState.Checkmate);
                    status.win = true;
                }

                setGameStatus({
                    isOver: true,
                    state: GameState.Checkmate,
                    ...status,
                });
                setModal(true);
            }
            if (
                state === GameState.Stalemate ||
                state === GameState.InsufficientMaterials ||
                state === GameState.ThreefoldRepetition
            ) {
                console.log("draw by " + state);
                setGameStatus({
                    isOver: true,
                    state,
                    draw: true,
                });
                setModal(true);
            }
        }

        let unsubOpponentMove = onOpponentMove(handleOpponentMove);
        let unsubGameStatusChange = onGameStatusChange(handleGameStatus);

        return () => {
            // unsubscribe
            unsubOpponentMove();
            unsubGameStatusChange();
        };
    }, []);

    useEffect(() => {
        if (!opponent) {
            return;
        }
        toast(`${opponent.name} has joined`, {
            icon: "🥊",
            position: "top-right",
            id: "opponent-joined", // to prevent duplicate toasts
        });
    }, [opponent]);

    useEffect(() => {
        setJoinCode("");
    }, []);

    const getLegalMoves = (sq: string): TMove[] => {
        try {
            return chess.moves_for_square(sq);
        } catch {
            console.log("cant generate legal moves");
            return [];
        }
    };

    const renderGameStatus = () => {
        if (!gameStatus) return null;

        let reason;
        if (gameStatus.win) {
            reason = <p>You won by {gameStatus.state} 🥳</p>;
        }

        if (gameStatus.lose) {
            reason = <p>You lost by {gameStatus.state} 🙁</p>;
        }

        if (gameStatus.draw) {
            reason = <p>Game draw by {gameStatus.state}</p>;
        }

        return (
            <div>
                {reason}
                <button
                    onClick={leaveGame}
                    className="w-full rounded py-3 mt-5 bg-slate-100 text-lg"
                >
                    back to menu
                </button>
            </div>
        );
    };

    const extraCls = classNames({
        waiting: !opponent,
        // "overflow-hidden": opponent !== undefined,
    });
    const captures = chess.get_captures();

    return (
        <div className={`game-container ${extraCls}`}>
            {opponent === undefined && (
                <div className="game-info text-lg">
                    <p>Invite code:</p>
                    <CopyMe room_id={room_id || ""} />
                    <p className="text-sm">Or use this link:</p>
                    <p className="text-sm">
                        https://chess.hieudev.me/join?code={room_id}
                    </p>
                    <p className="mt-2">
                        The first to join will play against you.
                    </p>
                    <button
                        onClick={leaveGame}
                        className="w-full rounded py-3 mt-5 bg-slate-50 text-red-600 text-lg"
                    >
                        cancel
                    </button>
                </div>
            )}

            <div className="opponent-info">
                {!opponent ? (
                    <p className="text-xl">Waiting for player...</p>
                ) : (
                    <>
                        <PlayerInfo playerInfo={opponent} />
                        <div className="captures">
                            <Captures captures={captures[opponent.color]} />
                        </div>
                    </>
                )}
            </div>

            <Board
                isPlaying={true}
                isOver={!!gameStatus}
                myColor={myColor}
                sideToMove={sideToMove}
                playMove={(m) => {
                    playMove(m);
                    makeMove(m);
                    setSideToMove(chess.turn() as TColor);
                }}
                flipped={myColor === "b"}
                getLegalMoves={getLegalMoves}
            />

            <div className="my-info">
                <PlayerInfo
                    playerInfo={{
                        name,
                        color: myColor,
                    }}
                />
                <div className="captures">
                    <Captures captures={captures[myColor]} />
                </div>
            </div>

            <Modal isOpen={modal} onRequestClose={() => setModal(false)}>
                <div>{renderGameStatus()}</div>
            </Modal>

            <Toaster />
        </div>
    );
}

type CapturesProps = {
    captures: TCapture[];
};

const values = {
    pawn: 1,
    knight: 3,
    bishop: 4,
    rook: 5,
    queen: 9,
};

function Captures({ captures }: CapturesProps) {
    captures.sort(
        (a, b) =>
            values[b.piece.p_type.toLowerCase() as keyof typeof values] -
            values[a.piece.p_type.toLowerCase() as keyof typeof values]
    );

    let captureElements: JSX.Element[] = [];
    let pawnsCount = 0;
    let pawn_color;

    captures.forEach((c, i) => {
        let color;
        let pieceType = c.piece.p_type.toLowerCase();

        color = c.piece.color === "WHITE" ? "w" : "b";
        pawn_color = color;

        if (pieceType === "pawn") {
            pawnsCount++;
        } else {
            captureElements.push(
                <svg viewBox="0 0 45 45" width="25px" height="25px" key={i}>
                    <use href={`${pieces}#piece-${color}-${pieceType}`}></use>
                </svg>
            );
        }
    });

    if (pawnsCount > 0) {
        captureElements.push(
            <div className="flex">
                <svg viewBox="0 0 45 45" width="25px" height="25x" key={1234}>
                    <use href={`${pieces}#piece-${pawn_color}-pawn`}></use>
                </svg>
                <span> x {pawnsCount}</span>
            </div>
        );
    }

    return captureElements;
}

type CopyMeProps = {
    room_id: string;
};

function CopyMe({ room_id }: CopyMeProps) {
    const [isCopied, setIsCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(room_id);
        setIsCopied(true);
    };

    return (
        <div className="flex flex-nowrap my-1">
            <input
                className="w-full p-2 outline-none border rounded-l-lg placeholder-gray-500"
                value={room_id}
                readOnly
            />
            <button
                onClick={copyCode}
                className="text-base min-w-16 text-center justify-center flex-shrink-0 inline-flex items-center px-4 font-medium bg-slate-100 rounded-e-lg"
            >
                {isCopied ? <span>👍</span> : <span>copy</span>}
            </button>
        </div>
    );
}
