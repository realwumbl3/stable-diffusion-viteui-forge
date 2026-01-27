import { useEffect, useRef } from "react";

const BASE_TITLE = "SD viteUI";
const TITLE_SPINNER_FRAMES = [
    "⠇⠀⠀",
    "⠋⠀⠀",
    "⠉⠂⠀",
    "⠈⠢⠀",
    "⠀⠢⠄",
    "⠀⠠⠤",
    "⠀⠀⠴",
    "⠀⠀⠸",
    "⠀⠀⠙",
    "⠀⠈⠉",
    "⠠⠊⠀",
    "⠤⠂⠀",
    "⠦⠀⠀",
];

export function useTitleIconAnimation(loading: boolean): void {
    const frameIndexRef = useRef(0);

    useEffect(() => {
        if (loading) {
            const title = (index: number) => `Generating… ${TITLE_SPINNER_FRAMES[index]}`;
            document.title = title(0);

            const intervalId = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    frameIndexRef.current = (frameIndexRef.current + 1) % TITLE_SPINNER_FRAMES.length;
                    document.title = title(frameIndexRef.current);
                }
            }, 120);

            return () => clearInterval(intervalId);
        } else {
            document.title = BASE_TITLE;
        }
    }, [loading]);
}
