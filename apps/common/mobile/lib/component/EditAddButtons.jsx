/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { Fragment } from 'react';
import { ToolbarIconLink } from './ToolbarIconLink';
import { toolbarIcons } from '../icons';

// Edit and add popovers anchor to #btn-edit and #btn-add in every editor.
// add button uses icon-plus, per Euro-Office/web-apps#146 (n-goncalves)
export function EditAddButtons({ disabledEdit, disabledAdd, onEditClick, onAddClick }) {
    return (
        <Fragment>
            <ToolbarIconLink id="btn-edit" icon={toolbarIcons.editSettings} disabled={disabledEdit} onClick={onEditClick} />
            <ToolbarIconLink id="btn-add" icon={toolbarIcons.plus} disabled={disabledAdd} onClick={onAddClick} />
        </Fragment>
    );
}
