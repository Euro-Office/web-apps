import React, { useContext, useEffect } from 'react';
import { f7, View, Popup, Popover } from 'framework7-react';
import { Device } from '../../../../../common/mobile/utils/device.jsx';
import DocumentSettingsController from "../../controller/settings/DocumentSettings.jsx";
import DocumentInfoController from "../../controller/settings/DocumentInfo.jsx";
import { DownloadController } from "../../controller/settings/Download.jsx";
import ApplicationSettingsController from "../../controller/settings/ApplicationSettings.jsx";
import { DocumentFormats, DocumentMargins, DocumentColorSchemes } from "./DocumentSettings.jsx";
import { MacrosSettings, ThemeSettings } from "./ApplicationSettings.jsx";
import About from '../../../../../common/mobile/lib/view/About.jsx';
import NavigationController from '../../controller/settings/Navigation.jsx';
import SharingSettings from "../../../../../common/mobile/lib/view/SharingSettings.jsx";
import ProtectionDocumentController from '../../controller/settings/DocumentProtection.jsx';
import ProtectionController from '../../controller/settings/Protection.jsx';
import FileEncryptionController from '../../controller/settings/FileEncryption.jsx';
import SettingsPage from './SettingsPage.jsx';
import { MainContext } from '../../page/main.jsx';
import VersionHistoryController from '../../../../../common/mobile/lib/controller/VersionHistory.jsx';

const routes = [
    {
        path: '/settings/',
        component: SettingsPage,
        keepAlive: true,
    },
    {
        path: '/document-settings/',
        component: DocumentSettingsController,
    },
    {
        path: '/margins/',
        component: DocumentMargins,
    },
    {
        path: '/document-formats/',
        component: DocumentFormats,
    },
    {
        path: "/document-info/",
        component: DocumentInfoController,
    },
    {
        path: '/application-settings/',
        component: ApplicationSettingsController
    },
    {
        path: '/macros-settings/',
        component: MacrosSettings
    },
    {
        path: '/download/',
        component: DownloadController
    },
    {
        path: '/color-schemes/',
        component: DocumentColorSchemes
    },
    {
        path: '/about/',
        component: About
    },
    {
        path: '/theme-settings/',
        component: ThemeSettings
    },
    // Navigation
    {
        path: '/navigation',
        component: NavigationController
    },
    // Sharing Settings
    {
        path: '/sharing-settings/',
        component: SharingSettings
    },
    // Protection
    {
        path: '/protection',
        component: ProtectionController
    },
    {
        path: '/protect',
        component: ProtectionDocumentController
    },
    // Encryption
    {
        path: '/encrypt',
        component: FileEncryptionController
    },
    // Version History 
    {
        path: '/version-history',
        component: VersionHistoryController,
        options: {
            props: {
                isNavigate: true
            }
        }
    },
];

routes.forEach(route => {
    route.options = {
        ...route.options,
        transition: 'f7-push'
    };
});

const SettingsView = () => {
    const mainContext = useContext(MainContext);

    useEffect(() => {
        if(Device.phone) {
            f7.popup.open('.settings-popup');
        } else {
            f7.popover.open('#settings-popover', '#btn-settings');
        }
    }, []);

    return (
        !Device.phone ?
            <Popover id="settings-popover" closeByOutsideClick={false} className="popover__titled" onPopoverClosed={() => mainContext.closeOptions('settings')}>
                <View style={{ height: '410px' }} routes={routes} url='/settings/'>
                    <SettingsPage />
                </View>
            </Popover> :
            <Popup className="settings-popup" onPopupClosed={() => mainContext.closeOptions('settings')}>
                <View routes={routes} url='/settings/'>
                    <SettingsPage />
                </View> 
            </Popup>
    )
};

export default SettingsView;
