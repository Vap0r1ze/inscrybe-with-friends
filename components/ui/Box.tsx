import { ReactNode, forwardRef } from 'react';
import styles from './Box.module.css';
import classNames from 'classnames';

export interface BoxProps {
    children?: ReactNode;
    onClick?: (event: Event) => void;
    className?: string;
}
export const Box = forwardRef<HTMLDivElement, BoxProps>(function Box({ children, onClick, className }, ref) {
    return <div ref={ref} onClick={onClick} className={classNames(styles.box, className)}>
        {children}
    </div>;
});
