import styles from './Button.module.css';
import { ReactNode } from 'react';
import classNames from 'classnames';
import { HoverBorder } from '../ui/HoverBorder';

export interface ButtonProps {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}
export function Button({ children, onClick, disabled }: ButtonProps) {
    return <button
        className={classNames(styles.button, {
            [styles.disabled]: disabled,
        })}
        data-hover-target
        onClick={onClick}
    >
        <div>{children}</div>
        <HoverBorder inset={-2} bottom={-3} />
    </button>;
}
