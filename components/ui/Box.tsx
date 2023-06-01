import { ReactNode, forwardRef } from 'react';
import styles from './Box.module.css';
import classNames from 'classnames';

export interface BoxProps {
    children?: ReactNode;
    className?: string;
}
export const Box = forwardRef<HTMLDivElement, BoxProps>(function Box({ children, className }, ref) {
    return <div ref={ref} className={classNames(styles.box, className)}>
        {children}
    </div>;
});
