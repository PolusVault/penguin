import { useState } from "react";
import Board from "../ui/Board";
import { chess, playMove, TColor, TMove } from "../chess";
import { useGameState, GameStateActions } from "../stores/gameState";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import pieces from "../assets/pieces.svg";

type Props = {
    createGame(): void;
    joinGame(code: string): void;
};

export default function Home({ createGame, joinGame }: Props) {
    const [sideToMove, setSideToMove] = useState<TColor>(
        chess.turn() as TColor
    );
    const [isCreatingGame, setIsCreatingGame] = useState(false);
    const [isJoiningGame, setIsJoiningGame] = useState(false);
    const { name, myColor, setName, setColor, setJoinCode, joinCode } =
        useGameState((state) => ({
            ...state,
        }));

    const getLegalMoves = (sq: string): TMove[] => {
        try {
            return chess.moves_for_square(sq);
        } catch {
            console.log("cant generate legal moves");
            return [];
        }
    };

    return (
        <div className="home-container">
            <section className="menu">
                <p className="text-3xl text-center py-3 mb-4 font-medium text-[#292828]">
                    Penguin 🐧
                </p>
                <Button
                    size="big"
                    hover
                    onClick={() => {
                        setIsCreatingGame(true);
                    }}
                >
                    create a game
                </Button>
                <Button
                    size="big"
                    color="secondary"
                    hover
                    onClick={() => setIsJoiningGame(true)}
                    className="my-3"
                >
                    join a game
                </Button>
                <div className="flex justify-between opacity-35">
                    <p>
                        made by
                        <span className="ml-1 underline">
                            <a target="_blank" href="https://hieudev.me">
                                Hieu
                            </a>
                        </span>
                    </p>
                    <a
                        className="underline"
                        target="_blank"
                        href="https://github.com/PolusVault/chess"
                    >
                        view source
                    </a>
                </div>
            </section>

            <Board
                isPlaying={false}
                isOver={false}
                myColor="w"
                sideToMove={sideToMove}
                playMove={(m) => {
                    playMove(m);
                    setSideToMove(chess.turn() as TColor);
                }}
                flipped={myColor === "b"}
                getLegalMoves={getLegalMoves}
            />

            <Modal
                isOpen={isCreatingGame || isJoiningGame}
                onRequestClose={() => {
                    setIsCreatingGame(false);
                    setIsJoiningGame(false);
                }}
            >
                {isCreatingGame && (
                    <CreateGameModalContent
                        name={name}
                        setName={setName}
                        setColor={setColor}
                        createGame={createGame}
                        close={() => setIsCreatingGame(false)}
                    />
                )}

                {isJoiningGame && (
                    <JoinGameModal
                        joinCode={joinCode || ""}
                        setJoinCode={setJoinCode}
                        name={name}
                        setName={setName}
                        joinGame={joinGame}
                        close={() => setIsJoiningGame(false)}
                    />
                )}
            </Modal>
        </div>
    );
}

type CreateGameModalProps = {
    name: string;
    setName: GameStateActions["setName"];
    setColor: GameStateActions["setColor"];
    createGame(): void;
    close(): void;
};

function CreateGameModalContent({
    name,
    setName,
    setColor,
    createGame,
    close,
}: CreateGameModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="min-w-64">
            <div className="flex justify-between">
                <p>new game</p>

                <button className="text-red-700" onClick={close}>
                    X
                </button>
            </div>
            <div>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                            setIsLoading(true);
                            createGame();
                        }
                    }}
                    type="text"
                    placeholder="enter a name"
                    autoFocus
                    className="w-full my-2 p-2 border rounded placeholder-gray-500 focus:placeholder-opacity-75"
                    maxLength={15}
                />
            </div>
            <p className="mt-3">pick your color: </p>
            <div className="w-full flex mt-2">
                <button
                    className="w-1/2 flex justify-center border pointer-events-auto"
                    onClick={() => setColor("w")}
                >
                    <svg viewBox="0 0 45 45" className="color-select">
                        <use href={`${pieces}#piece-w-king`}></use>
                    </svg>
                </button>
                <button
                    className="w-1/2 flex justify-center border pointer-events-auto"
                    onClick={() => setColor("b")}
                >
                    <svg viewBox="0 0 45 45" className="color-select">
                        <use href={`${pieces}#piece-b-king`}></use>
                    </svg>
                </button>
            </div>
            <Button
                disabled={isLoading}
                size="normal"
                className="w-full mt-3"
                onClick={() => {
                    setIsLoading(true);
                    createGame();
                }}
            >
                {isLoading ? "loading..." : "create"}
            </Button>
        </div>
    );
}

type JoinGameModalProps = {
    name: string;
    joinCode: string;
    setName: GameStateActions["setName"];
    setJoinCode: GameStateActions["setJoinCode"];
    joinGame(code: string): void;
    close(): void;
};

function JoinGameModal({
    joinCode,
    name,
    setName,
    setJoinCode,
    joinGame,
    close,
}: JoinGameModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="min-w-64">
            <div className="flex justify-between">
                <p>join game</p>

                <button className="text-red-700" onClick={close}>
                    X
                </button>
            </div>
            <div className="my-2">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="enter a name"
                    autoFocus
                    className="w-full my-2 p-2 border rounded placeholder-gray-500 focus:placeholder-opacity-75"
                    maxLength={15}
                />
            </div>
            <div>
                <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                            setIsLoading(true);
                            joinGame(joinCode);
                        }
                    }}
                    type="text"
                    placeholder="enter join code"
                    autoFocus
                    className="w-full mb-2 p-2 border rounded placeholder-gray-500 focus:placeholder-opacity-75"
                    maxLength={15}
                />
            </div>
            <Button
                disabled={isLoading}
                size="normal"
                className="w-full mt-3"
                onClick={() => {
                    setIsLoading(true);
                    joinGame(joinCode);
                }}
            >
                {isLoading ? "loading..." : "join"}
            </Button>
        </div>
    );
}
