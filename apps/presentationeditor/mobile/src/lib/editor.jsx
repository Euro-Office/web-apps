/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';
import { UndoRedo } from '../../../../common/mobile/lib/component/UndoRedo';
import { EditAddButtons } from '../../../../common/mobile/lib/component/EditAddButtons';
import { EditCommentControllers } from '../../../../common/mobile/lib/controller/collaboration/Comments';

export {
    initThemeColors,
    initFonts,
    initEditorStyles,
    initFocusObjects,
    initTableTemplates,
    updateChartStyles,
} from './sdkEvents';

export const getUndoRedo = props => <UndoRedo {...props} />;

export const getToolbarOptions = props => <EditAddButtons {...props} />;

export const getEditCommentControllers = () => <EditCommentControllers />;
