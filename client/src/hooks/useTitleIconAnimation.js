import { useEffect, useRef } from "react";

const BASE_TITLE = "sd-vite-ui";
const TITLE_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const RANDOM_BRAILLE_MIN = 0x2800;
const RANDOM_BRAILLE_RANGE = 0x100;

const getRandomBrailleChar = () =>
    String.fromCharCode(RANDOM_BRAILLE_MIN + Math.floor(Math.random() * RANDOM_BRAILLE_RANGE));

export function useTitleIconAnimation(loading) {
    const frameRef = useRef(-1);
    const startTimeRef = useRef(0);

    useEffect(() => {
        let intervalId;
        if (loading) {
            startTimeRef.current = performance.now();
            frameRef.current = -1;

            const updateTitle = () => {
                const elapsed = performance.now() - startTimeRef.current;
                let titleSymbol;

                if (elapsed < 1000) {
                    titleSymbol = getRandomBrailleChar();
                } else {
                    const nextIndex =
                        (frameRef.current + 1) % TITLE_SPINNER_FRAMES.length;
                    frameRef.current = nextIndex;
                    titleSymbol = TITLE_SPINNER_FRAMES[nextIndex];
                }

                document.title = `${titleSymbol} Generating… | ${BASE_TITLE}`;
            };

            updateTitle();
            intervalId = window.setInterval(updateTitle, 120);
        } else {
            document.title = BASE_TITLE;
        }

        return () => {
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [loading]);
}
