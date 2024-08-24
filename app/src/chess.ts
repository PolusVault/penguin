import init, { ChessWasm } from "hieu-chess-wasm";
import wasmUrl from "hieu-chess-wasm/hieu_chess_wasm_bg.wasm?url";

// ------------------- START INIT -----------------
async function initChessLib() {
    const instance = await init(wasmUrl);

    const chess = ChessWasm.new();
    // let _board = new Uint8Array(instance.memory.buffer, chess.board(), 256);

    chess.reset();
    chess.load_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    // chess.load_fen("8/5P2/2q2Q2/6K1/2k5/8/3p4/8 w - - 0 1");

    return {
        chess,
        instance,
    };
}

export const { chess, instance } = await initChessLib();
// --------------------- END INIT -------------------

export type TColor = "w" | "b";

export type TMove = {
    from: string;
    to: string;
    promotion_piece?: string;
};

export type TCapture = {
    piece: { p_type: string; color: string };
};

export enum Status {
    Win,
    Lose,
    Draw,
}

export enum GameState {
    InProgress,
    Draw = "draw",
    Stalemate = "statemate",
    Checkmate = "checkmate",
    InsufficientMaterials = "insufficient materials",
    ThreefoldRepetition = "threefold repetition",
}

export class Piece {
    readonly type: string;
    readonly color: TColor;
    readonly rank: number;
    readonly file: number;
    readonly square: string;

    constructor(type: string, color: TColor, rank: number, file: number) {
        this.type = type;
        this.color = color;
        this.rank = rank;
        this.file = file;
        this.square = getSquareNotation(this.rank, this.file);
    }
}

export function getBoard(): (Piece | null)[] {
    // for whatever reason, we have to create this array here every time this function is called.
    // if we uncomment the _board variable above in the initChessLib function and reference it here,
    // the array will be empty after exactly 34 moves (17 on each side)
    // if someone stumbles upon this and can figure out why, please let me know (I can demonstrate if needed)
    let _board = new Uint8Array(instance.memory.buffer, chess.board(), 256);

    let board = [];

    for (let i = 0; i < _board.length; i += 2) {
        let idx = i / 2;

        if ((idx & 0x88) !== 0) {
            continue;
        }

        if (_board[i] == 0) {
            board.push(null);
            continue;
        }

        let piece = _board[i];
        let color = _board[i + 1];
        let type;

        switch (piece) {
            case 1:
                type = "pawn";
                break;
            case 2:
                type = "knight";
                break;
            case 4:
                type = "bishop";
                break;
            case 8:
                type = "rook";
                break;
            case 16:
                type = "queen";
                break;
            case 32:
                type = "king";
                break;
            default:
                throw new Error("invalid piece type");
        }

        board.push(
            new Piece(
                type,
                (color == 0 ? "w" : "b") as TColor,
                idx >> 4,
                idx & 7
            )
        );
    }

    return board;
}

export function newGame() {
    chess.reset();
    chess.load_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    // chess.load_fen("8/5P2/2q2Q2/6K1/2k5/8/3p4/8 w - - 0 1");
}

let recent_move: TMove | undefined = undefined;

export function getMostRecentMove() {
    return recent_move;
}

export function clearMostRecentMove() {
    recent_move = undefined;
}

export function playMove(m: TMove) {
    chess.play_move(m);
    recent_move = m;

    let state = GameState.InProgress;

    if (chess.is_checkmate()) {
        state = GameState.Checkmate;
    } else if (chess.is_stalemate()) {
        state = GameState.Stalemate;
    } else if (chess.is_insufficient_materials()) {
        state = GameState.InsufficientMaterials;
    } else if (chess.is_threefold_repetition()) {
        state = GameState.ThreefoldRepetition;
    }

    if (state != GameState.InProgress) {
        statusSubscribers.forEach((cb) => cb(state, chess.turn() as TColor));
    }
}

export function getSquareNotation(rank: number, file: number): string {
    return `${String.fromCharCode(97 + file)}${rank + 1}`;
}

export function getSquare(piece: Piece) {
    return getSquareNotation(piece.rank, piece.file);
}

type StatusCb = (state: GameState, color: TColor) => void;
const statusSubscribers: StatusCb[] = [];
export function onGameStatusChange(cb: StatusCb) {
    statusSubscribers.push(cb);

    return () => {
        for (let i = 0; i < statusSubscribers.length; i++) {
            const sub = statusSubscribers[i];
            if (sub == cb) {
                statusSubscribers.splice(i, 1);
            }
        }
    };
}
