import { useEffect, useRef } from "react";
import { PromotionPiece } from "./PromotionPiece";
import { TColor } from "../chess";

type PromotionWindowProps = {
    square: string;
    color: TColor;
    flipped: boolean;
    closePromotionWindow: () => void;
    onSelectPromotionPiece: (color: TColor, type: string) => void;
};

export default function PromotionWindow({
    square,
    color,
    flipped,
    closePromotionWindow,
    onSelectPromotionPiece,
}: PromotionWindowProps) {
    const promotionWindowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // TODO: this doesn't work because of the useeffect in Board.tsx line #143, but why?
        const onPointerDown = (e: MouseEvent) => {
            // if we click outside the promotion window, close it
            // console.log(e.target);
            if (
                promotionWindowRef.current &&
                !promotionWindowRef.current.contains(e.target as Node)
            ) {
                closePromotionWindow();
            }
        };

        document.addEventListener("pointerdown", onPointerDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
        };
    }, []);

    useEffect(() => {
        const parts = square.split("");
        const file = parts[3].charCodeAt(0) - 97;
        const rank = parts[4];

        if (!flipped) {
            const yShift = parseInt(rank) === 1 ? "100%" : "0%";
            promotionWindowRef.current!.style.transform = `translate(${
                file * 100
            }%, ${yShift})`;
        } else {
            const yShift = parseInt(rank) === 8 ? "100%" : "0%";
            promotionWindowRef.current!.style.transform = `translate(${
                (7 - file) * 100
            }%, ${yShift})`;
        }
    }, [square]);

    return (
        <div
            ref={promotionWindowRef}
            className={`block promotion-window bg-slate-200 rounded-lg ${square}`}
        >
            <div className="promotion-piece-container">
                {["queen", "rook", "bishop", "knight"].map((type) => (
                    <PromotionPiece
                        key={type}
                        color={color}
                        type={type}
                        onSelectPromotionPiece={onSelectPromotionPiece}
                    />
                ))}
            </div>
        </div>
    );
}
