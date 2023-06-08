import { MouseEventHandler, useEffect, useRef, useState } from 'react';
import styles from './Select.module.css';
import { Asset } from '../sprites/Asset';
import classNames from 'classnames';

export interface SelectProps {
    options: [string, string][];
    value?: string | null;
    content?: string;
    placeholder?: string;
    disabled?: boolean;
    editable?: boolean;
    onSelect?: (value: string) => void;
    onEdit?: (value: string) => void;
}

export function Select({
    options,
    value: valueProp,
    content,
    placeholder,
    disabled,
    editable,
    onSelect,
    onEdit,
}: SelectProps) {
    const [open, setOpen] = useState(false);
    const optionsRef = useRef<HTMLDivElement>(null);
    const [valueInput, setValue] = useState(valueProp ?? '');

    const value = valueProp ?? valueInput;
    const valueLabel = content ?? options.find(([v]) => v === value)?.[1] ?? '';

    const onSelectClick: MouseEventHandler<HTMLElement> = (e) => {
        if (disabled || editable) return;
        if (optionsRef.current?.contains(e.target as Node)) return;
        setOpen(o => !o);
    };
    const onDropdownClick = () => {
        if (disabled || !editable) return;
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!optionsRef.current) return;
        const { height: bodyHeight } = document.body.getBoundingClientRect();
        optionsRef.current.classList.remove(styles.overflows);
        const { bottom } = optionsRef.current.getBoundingClientRect();
        if (bottom > bodyHeight) optionsRef.current.classList.add(styles.overflows);
    }, [options]);

    // TODO: keyboard accessibility

    return (
        <div tabIndex={0} className={classNames(styles.select, {
            [styles.open]: open,
            [styles.disabled]: disabled,
            [styles.readonly]: !editable,
        })} onClick={onSelectClick} onBlur={() => setOpen(false)}>
            <input
                type="text"
                className={styles.value}
                readOnly={!editable}
                placeholder={placeholder}
                value={valueLabel}
                onChange={e => onEdit?.(e.target.value)}
            />
            <div className={styles.button} style={{
                transform: `rotate(${open ? 0 : 180}deg)`,
            }} onClick={onDropdownClick}>
                <Asset path="/assets/caret.png" />
            </div>
            <div ref={optionsRef} className={classNames(styles.options, {
                // [styles.overflows]: overflows,
            })}>
                {options.map(([optValue, label]) => (
                    <div
                        key={optValue}
                        className={classNames(styles.option, {
                            [styles.selected]: optValue === value,
                        })}
                        onClick={() => {
                            if (disabled) return;
                            onSelect?.(optValue);
                            setValue(optValue);
                            setOpen(false);
                        }}
                    >{label}</div>
                ))}
            </div>
        </div>
    );
}
