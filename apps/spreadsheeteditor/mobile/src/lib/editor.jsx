/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';
import { runInAction } from 'mobx';
import { UndoRedo } from '../../../../common/mobile/lib/component/UndoRedo';
import { EditAddButtons } from '../../../../common/mobile/lib/component/EditAddButtons';
import { isAddDisabled, isEditDisabled } from './selectionRules';
import { initCellInfo as bindCellInfo } from './sdkEvents';

export { initThemeColors, initEditorStyles, initFonts } from './sdkEvents';

export const initCellInfo = props => bindCellInfo(props, runInAction);

export const toolbarOptions = {
    getUndoRedo: props => <UndoRedo {...props} />,
    getEditOptions: ({ onEditClick, onAddClick, ...state }) => (
        <EditAddButtons
            disabledEdit={isEditDisabled(state)}
            disabledAdd={isAddDisabled(state)}
            onEditClick={onEditClick}
            onAddClick={onAddClick}
        />
    ),
};
