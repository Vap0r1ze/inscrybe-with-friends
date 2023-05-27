import { useState } from 'react';

interface TextProps {
    text: string;
    size?: number;
}
export default function FitText({ text, size = 6 }: TextProps) {
    const [scaledSize, setSize] = useState<number>();
    const containerRef = (ref: HTMLElement | null) => {
        if (!ref?.parentElement || scaledSize != null) return;

        const parentStyle = getComputedStyle(ref.parentElement);
        const parentWidth = ref.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);

        const ratio = parentWidth / ref.clientWidth;
        console.log(text, parentWidth , ref.clientWidth);
        setSize(size * Math.min(1, ratio));
    };

    return <span ref={containerRef} style={{
        visibility: scaledSize == null ? 'hidden' : 'visible',
        fontSize: `${scaledSize ?? size}em`,
        whiteSpace: 'pre',
        transform: 'translateY(5%)',
    }}>{text}</span>;
}
