/*!
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, {useEffect} from 'react';
import {observer, inject} from 'mobx-react';
import {f7} from 'framework7-react';
import {Device} from '../../../../../common/mobile/utils/device';
import {panelToClose} from '../../lib/editTarget.js';

// Renders an edit sub-page only while hasTarget(storeFocusObjects) holds, and
// closes the edit panel otherwise. Pages read their object before their hooks,
// so the check sits outside them. The panel must close, because a routed page
// that renders nothing leaves the tablet popover stuck on its navbar.
const withEditTarget = (hasTarget, Page) => inject("storeFocusObjects")(observer(props => {
    const panel = panelToClose(hasTarget(props.storeFocusObjects), Device.phone);
    useEffect(() => {
        if (panel === 'sheet') {
            $$('.sheet-modal.modal-in').length > 0 && f7.sheet.close();
        } else if (panel === 'popover') {
            f7.popover.close('#edit-popover', false);
        }
    }, [panel]);
    return panel ? null : <Page {...props}/>;
}));

export default withEditTarget;
