import styles from './Button.module.css';
import { ReactNode } from 'react';
import classNames from 'classnames';
import { HoverBorder } from '../ui/HoverBorder';

export interface ButtonProps {
    className?: string;
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    border?: string
}
export function Button({ className, children, onClick, disabled, border }: ButtonProps) {
    return <button
        className={classNames(styles.button, className, {
            [styles.disabled]: disabled,
        })}
        data-hover-target
        data-hover-blip
        onClick={onClick}
    >
        {children}
        <HoverBorder inset={-2} bottom={-3} color={border} />
    </button>;
}
