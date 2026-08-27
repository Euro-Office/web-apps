import React from 'react';
import { Link } from 'framework7-react';
import PlatformIcon from './PlatformIcon';

// slot="media" is the established convention for every icon-only Link in this codebase
// (apps/documenteditor/mobile/src/view/Toolbar.jsx uses it on all 10 of its icon-only Links,
// no exceptions) -- defaulted here so callers can't silently drop it, which is exactly what
// happened before this component existed (spreadsheet/presentation editors' toolbar buttons
// never passed it).
export default function ToolbarIconLink({ id, disabled, onClick, icon, slot = 'media' }) {
    return (
        <Link iconOnly id={id} href={false} className={disabled ? 'disabled' : ''} onClick={onClick}>
            <PlatformIcon ios={icon.ios} android={icon.android} slot={slot} />
        </Link>
    );
}
