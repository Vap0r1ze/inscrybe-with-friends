import { MouseEventHandler, ReactNode, forwardRef } from 'react';
import styles from './Box.module.css';
import classNames from 'classnames';

export interface BoxProps {
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLDivElement>;
    className?: string;
    dark?: boolean;
}
export const Box = forwardRef<HTMLDivElement, BoxProps>(function Box({
    children,
    onClick,
    className,
    dark,
}, ref) {
    return <div ref={ref} onClick={onClick} className={classNames(styles.box, className, {
        [styles.dark]: dark,
    })}>
        {children}
    </div>;
});
