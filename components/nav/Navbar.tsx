import styles from './Navbar.module.css';
import classNames from 'classnames';
import { Settings } from './Settings';
import { Breadcrumbs } from './Breadcrumbs';

export interface NavbarProps {
    className?: string;
}
export function Navbar({ className }: NavbarProps) {
    return <div className={classNames(styles.nav, className)}>
        <Breadcrumbs />
        <div style={{ flex: 1 }} />
        <Settings />
    </div>;
}
