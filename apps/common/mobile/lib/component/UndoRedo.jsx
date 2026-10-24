/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { Fragment } from 'react';
import { ToolbarIconLink } from './ToolbarIconLink';
import { toolbarIcons } from '../icons';

export function UndoRedo({ disabledUndo, disabledRedo, onUndoClick, onRedoClick }) {
    return (
        <Fragment>
            <ToolbarIconLink icon={toolbarIcons.undo} disabled={disabledUndo} onClick={onUndoClick} />
            <ToolbarIconLink icon={toolbarIcons.redo} disabled={disabledRedo} onClick={onRedoClick} />
        </Fragment>
    );
}
