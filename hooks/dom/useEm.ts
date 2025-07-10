import { RefObject, useEffect, useState } from 'react';

export function useEm<T extends HTMLElement>(target: RefObject<T | null>) {
    const [em, setEm] = useState(0);

    useEffect(() => {
        if (!target.current) return;

        const fontSizePx = parseFloat(getComputedStyle(target.current).fontSize);
        setEm(fontSizePx / 2);
    }, [target]);

    return em;
}
