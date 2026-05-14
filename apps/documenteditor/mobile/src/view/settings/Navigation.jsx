/*
 * Copyright (C) Ascensio System SIA, 2009-2026
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation, together with the
 * additional terms provided in the LICENSE file.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For
 * details, see the GNU AGPL at: https://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA by email at info@onlyoffice.com
 * or by postal mail at 20A-6 Ernesta Birznieka-Upisha Street, Riga,
 * LV-1050, Latvia, European Union.
 *
 * The interactive user interfaces in modified versions of the Program
 * are required to display Appropriate Legal Notices in accordance with
 * Section 5 of the GNU AGPL version 3.
 *
 * No trademark rights are granted under this License.
 *
 * All non-code elements of the Product, including illustrations,
 * icon sets, and technical writing content, are licensed under the
 * Creative Commons Attribution-ShareAlike 4.0 International License:
 * https://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * This license applies only to such non-code elements and does not
 * modify or replace the licensing terms applicable to the Program's
 * source code, which remains licensed under the GNU Affero General
 * Public License v3.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { useState, useEffect, useContext } from "react";
import { Device } from '../../../../../common/mobile/utils/device';
import {f7, List, ListItem, Icon, Page, Navbar, Sheet} from 'framework7-react';
import { useTranslation } from 'react-i18next';
import { inject, observer } from "mobx-react";
import { MainContext } from "../../page/main";

const NavigationPopover = inject('storeNavigation')(observer(props => {
    const { t } = useTranslation();
    const _t = t('Settings', {returnObjects: true});
    const api = Common.EditorApi.get();
    const storeNavigation = props.storeNavigation;
    const bookmarks = storeNavigation.bookmarks;
    const navigationObject = api.asc_ShowDocumentOutline();
    const [currentPosition, setCurrentPosition] = useState(navigationObject ? navigationObject.get_CurrentPosition() : bookmarks.length ? bookmarks[0] : null);
    let arrHeaders = [];

    if(navigationObject) {
        arrHeaders = props.updateNavigation();
    } else if(bookmarks.length) {
        arrHeaders = props.updateViewerNavigation(bookmarks);
    }

    return (
        <Page>
            <Navbar title={t('Settings.textNavigation')} backLink={_t.textBack} />
            {!arrHeaders || !arrHeaders.length 
                ?
                    <div className="empty-screens">
                        <p className="empty-screens__text">{t('Settings.textEmptyScreens')}</p>
                    </div>
                :
                    <List className="navigation-list" style={!Device.phone ? { height: '352px', marginTop: 0 } : null}>
                        {arrHeaders.map((header, index) => {
                            return (
                                <ListItem radio key={index} title={header.isEmptyItem ? t('Settings.textBeginningDocument') : header.name} checked={header.index === currentPosition} style={{paddingLeft: header.level * 16}} onClick={() => {
                                    setCurrentPosition(header.index);
                                    props.onSelectItem(header.index);
                                }}></ListItem>
                            )
                        })}
                    </List>
            }
        </Page>
    )
}));

const NavigationSheet = inject('storeNavigation')(observer(props => {
    const { t } = useTranslation();
    const mainContext = useContext(MainContext);
    const api = Common.EditorApi.get();
    const storeNavigation = props.storeNavigation;
    const bookmarks = storeNavigation.bookmarks;
    const navigationObject = api.asc_ShowDocumentOutline();
    const [currentPosition, setCurrentPosition] = useState(navigationObject ? navigationObject.get_CurrentPosition() : bookmarks.length ? bookmarks[0] : null);
    let arrHeaders = [];

    if(navigationObject) {
        arrHeaders = props.updateNavigation();
    } else if(bookmarks.length) {
        arrHeaders = props.updateViewerNavigation(bookmarks);
    }

    const [stateHeight, setHeight] = useState('45%');
    const [stateOpacity, setOpacity] = useState(1);

    const [stateStartY, setStartY] = useState();
    const [isNeedClose, setNeedClose] = useState(false);

    const handleTouchStart = (event) => {
        const touchObj = event.changedTouches[0];
        setStartY(parseInt(touchObj.clientY));
    };

    const handleTouchMove = (event) => {
        const touchObj = event.changedTouches[0];
        const dist = parseInt(touchObj.clientY) - stateStartY;

        if (dist < 0) { 
            setHeight('90%');
            setOpacity(1);
            setNeedClose(false);
        } else if (dist < 80) {
            setHeight('45%');
            setOpacity(1);
            setNeedClose(false);
        } else {
            setNeedClose(true);
            setOpacity(0.6);
        }
    };

    const handleTouchEnd = (event) => {
        const touchObj = event.changedTouches[0];
        const swipeEnd = parseInt(touchObj.clientY);
        const dist = swipeEnd - stateStartY;

        if (isNeedClose) {
            f7.sheet.close('#view-navigation-sheet');
        } else if (stateHeight === '90%' && dist > 20) {
            setHeight('45%');
        }
    };

    useEffect(() => {
        f7.sheet.open('#view-navigation-sheet', true);
    }, []);

    return (
        <Sheet id="view-navigation-sheet" className="navigation-sheet" backdrop={true} closeByBackdropClick={true} onSheetClosed={() => mainContext.closeOptions('navigation')} style={{height: `${stateHeight}`, opacity: `${stateOpacity}`}}>
            <div id='swipe-handler' className='swipe-container' onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <Icon icon='icon icon-swipe'/>
            </div>
            <div className="navigation-sheet__title">
                <p>{t('Settings.textNavigation')}</p>
            </div>
            {!arrHeaders || !arrHeaders.length 
                ?
                    <div className="empty-screens">
                        <p className="empty-screens__text">{t('Settings.textEmptyScreens')}</p>
                    </div>
                :
                    <List className="navigation-list">
                        {arrHeaders.map((header, index) => {
                            return (
                                <ListItem radio key={index} title={header.isEmptyItem ? t('Settings.textBeginningDocument') : header.name} checked={header.index === currentPosition} style={{paddingLeft: header.level * 16}} onClick={() => {
                                    setCurrentPosition(header.index);
                                    props.onSelectItem(header.index);
                                }}></ListItem>
                            )
                        })}
                    </List>
            }
        </Sheet>
    )
}));

export {
    NavigationPopover,
    NavigationSheet
};
