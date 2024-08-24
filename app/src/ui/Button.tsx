import { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"button"> & {
    children: React.ReactNode;
    size: keyof typeof sizes;
    color?: keyof typeof colorClasses;
    hover?: boolean;
};

const sizes = {
    big: "text-2xl w-64 p-3",
    normal: "text-lg p-1",
};

// TODO: do this through tailwind's config
const colorClasses = {
    // primary: "bg-[#527997] text-white",
    primary: "bg-[#3d3d3d] text-white",
    secondary: "border border-[#3d3d3d]",
};

// i know this isn't extensible at all which is the whole point, but it works for now
export default function Button({
    children,
    className,
    size,
    hover = false,
    color = "primary",
    ...others
}: Props) {
    //
    const defaultClases = `block rounded text-center disabled:opacity-50 ease-in duration-100 ${
        hover && "hover:scale-[1.05]"
    }`;

    return (
        <button
            className={`${defaultClases} ${className} ${colorClasses[color]} ${sizes[size]}`}
            {...others}
        >
            {children}
        </button>
    );
}
