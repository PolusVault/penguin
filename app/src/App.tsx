import { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import Home from "./modules/Home";
import Game from "./modules/Game";
import { socket, PlayerInfo, makePayload, emit } from "./socket";
import { useGameState } from "./stores/gameState";
import { TMove, playMove, newGame } from "./chess";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import "./App.css";

export default function App() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [_, setIsConnected] = useState(socket.connected);
    const [isJoiningThroughURL, setIsJoiningThroughURL] = useState<string>();
    const {
        myColor,
        name,
        room_id,
        setName,
        setOpponent,
        setColor,
        setRoomId,
        reset,
    } = useGameState((state) => ({
        ...state,
    }));
    const onOpponentMoveSubscribers = useRef<(() => void)[]>([]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get("code");
        if (
            joinCode &&
            joinCode.length === 6 &&
            joinCode.match(/^[0-9a-zA-Z]+$/)
        ) {
            setIsJoiningThroughURL(joinCode);
        }
    }, []);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onOpponentConnect(opponent: PlayerInfo) {
            setOpponent(opponent);
        }

        function onOpponentDisconnect() {
            toast("🏃 your opponent disconnected", {
                position: "top-right",
            });
            setOpponent(undefined);
        }

        function onMove(move: TMove) {
            try {
                playMove(move);
                onOpponentMoveSubscribers.current.forEach((cb) => cb());
            } catch (e) {
                console.log(e);
            }
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("opponent-connected", onOpponentConnect);
        socket.on("opponent-disconnected", onOpponentDisconnect);
        socket.on("make-move", onMove);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("opponent-connected", onOpponentConnect);
            socket.off("opponent-disconnected", onOpponentDisconnect);
            socket.off("make-move", onMove);
        };
    }, []);

    const createGame = () => {
        emit("create-game", makePayload({ color: myColor, name }), (res) => {
            if (!res.success) {
                toast.error("error while creating room");
                return;
            }
            setIsPlaying(true);
            setRoomId(res.payload);
            newGame();
        });
    };

    const joinGame = (code: string) => {
        emit("join-game", makePayload({ room_id: code, name }), (res) => {
            if (!res.success) {
                toast.error("error while joining room");
                return;
            }
            setOpponent(res.payload);
            setColor(res.payload.color === "w" ? "b" : "w");
            setIsPlaying(true);
            setRoomId(code);
            setIsJoiningThroughURL(undefined);
            newGame();
        });
    };

    const leaveGame = () => {
        if (!socket.connected) return;

        emit("leave-game", makePayload({ room_id }), () => {
            setIsPlaying(false);
            window.history.replaceState(null, "", "/");
            reset();
        });
    };

    const makeMove = (move: TMove) => {
        emit("make-move", makePayload({ move, room_id }));
    };

    const onOpponentMove = (cb: () => void) => {
        onOpponentMoveSubscribers.current.push(cb);

        return () => {
            for (let i = 0; i < onOpponentMoveSubscribers.current.length; i++) {
                const sub = onOpponentMoveSubscribers.current[i];
                if (sub == cb) {
                    onOpponentMoveSubscribers.current.splice(i, 1);
                }
            }
        };
    };

    return (
        <div className="app-container">
            {isPlaying ? (
                <Game
                    onOpponentMove={onOpponentMove}
                    leaveGame={leaveGame}
                    makeMove={makeMove}
                />
            ) : (
                <Home createGame={createGame} joinGame={joinGame} />
            )}

            <JoinThroughURL
                isJoiningThroughURL={isJoiningThroughURL}
                name={name}
                setName={setName}
                joinGame={joinGame}
            />

            <Toaster />
        </div>
    );
}

type JoinThroughURLProps = {
    isJoiningThroughURL: string | undefined;
    name: string;
    setName(name: string): void;
    joinGame(code: string): void;
};

function JoinThroughURL({
    isJoiningThroughURL,
    name,
    setName,
    joinGame,
}: JoinThroughURLProps) {
    const [isLoading, setIsLoading] = useState(false);

    return (
        <Modal isOpen={!!isJoiningThroughURL}>
            <div className="min-w-64">
                <div className="flex justify-between">
                    <p>give yourself a name</p>
                </div>
                <div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                joinGame(isJoiningThroughURL!);
                                setIsLoading(true);
                            }
                        }}
                        type="text"
                        placeholder="enter a name"
                        autoFocus
                        className="w-full my-2 p-2 border rounded placeholder-gray-500 focus:placeholder-opacity-75"
                        maxLength={15}
                    />
                </div>

                <Button
                    disabled={isLoading}
                    size="normal"
                    className="w-full mt-3"
                    onClick={() => {
                        joinGame(isJoiningThroughURL!);
                        setIsLoading(true);
                    }}
                >
                    {isLoading ? "loading..." : "join"}
                </Button>
            </div>
        </Modal>
    );
}
