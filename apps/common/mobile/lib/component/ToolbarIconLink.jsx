/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';
import { Link } from 'framework7-react';
import { Device } from '../../utils/device';
import SvgIcon from './SvgIcon';

export function ToolbarIconLink({ id, icon, disabled, onClick }) {
    return (
        <Link iconOnly href={false} id={id} className={disabled ? 'disabled' : ''} onClick={onClick}>
            <SvgIcon slot="media" symbolId={(Device.ios ? icon.ios : icon.android).id} className="icon icon-svg" />
        </Link>
    );
}
