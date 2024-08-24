import { PlayerInfo as TPlayerInfo } from "../socket";

type Props = {
    playerInfo: TPlayerInfo;
};

export default function PlayerInfo({ playerInfo }: Props) {
    return (
        <div>
            <p className="text-xl">{playerInfo.name}</p>
        </div>
    );
}
