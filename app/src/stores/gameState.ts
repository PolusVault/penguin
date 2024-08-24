import { create } from "zustand";
import { TColor } from "../chess";
import { PlayerInfo } from "../socket";

type GameState = {
    name: string;
    myColor: TColor;
    room_id?: string;
    joinCode?: string;
    opponent?: PlayerInfo;
};

export type GameStateActions = {
    setName(name: GameState["name"]): void;
    setColor(color: GameState["myColor"]): void;
    setJoinCode(code: string): void;
    setOpponent(opponent: GameState["opponent"]): void;
    setRoomId(room_id: GameState["room_id"]): void;
    reset(): void;
};

const initialState: GameState = {
    name: "",
    myColor: "w",
    // need this for reset to work for some reason?
    // see if zustand has option to replace state but exclude the actions
    joinCode: undefined,
    room_id: undefined,
    opponent: undefined,
};

export const useGameState = create<GameState & GameStateActions>((set) => ({
    ...initialState,

    setName: (name) => set({ name }),
    setColor: (myColor) => set({ myColor }),
    setJoinCode: (joinCode) => set({ joinCode }),
    setOpponent: (opponent) => set({ opponent }),
    setRoomId: (room_id) => set({ room_id }),
    reset: () => set(initialState),
}));
