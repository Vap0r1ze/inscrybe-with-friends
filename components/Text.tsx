import classNames from 'classnames';
import styles from './Text.module.css';
import { ReactNode, useState } from 'react';

interface FitProps {
    children?: ReactNode;
    size: number;
}
function Fit({ children, size }: FitProps) {
    const [scaledSize, setSize] = useState<number>();
    const containerRef = (ref: HTMLElement | null) => {
        if (!ref?.parentElement || scaledSize != null) return;

        const parentStyle = getComputedStyle(ref.parentElement);
        const parentWidth = ref.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);

        const ratio = parentWidth / ref.clientWidth;
        setSize(size * Math.min(1, ratio));
    };

    return <span ref={containerRef} style={{
        visibility: scaledSize == null ? 'hidden' : 'visible',
        fontSize: `${scaledSize ?? size}em`,
    }}>{children}</span>;
}

interface TextProps {
    children: ReactNode;
    className?: string;
    fit?: boolean;
    size?: number;
}
export function Text({ className, children, fit, size = 9 }: TextProps) {
    const innerSize = fit ? 1 : size;
    const wrapper = (content: JSX.Element) => {
        if (fit) return <Fit size={size}>{content}</Fit>;
        return <>{content}</>;
    };

    return wrapper(<span className={classNames(styles.text, className, {
        [styles.fit]: fit,
    })} style={{ fontSize: `${innerSize}em` }}>{children}</span>);
}
