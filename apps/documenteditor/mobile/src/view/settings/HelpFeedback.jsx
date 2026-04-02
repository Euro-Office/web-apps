import React, { useContext } from 'react';
import { observer, inject } from 'mobx-react';
import { Page, Navbar, List, ListItem } from 'framework7-react';
import { useTranslation } from 'react-i18next';
import { Device } from '../../../../../common/mobile/utils/device';
import SvgIcon from '@common/lib/component/SvgIcon';
import { SettingsContext } from '../../controller/settings/Settings';
import IconHelp from '@common-icons/icon-help.svg';
import IconFeedbackForIos from '@common-ios-icons/icon-feedback.svg?ios';
import IconFeedbackForAndroid from '@common-android-icons/icon-feedback.svg';

const HelpFeedbackView = inject('storeAppOptions')(observer(props => {
    const { t } = useTranslation();
    const _t = t('Settings', { returnObjects: true });
    const settingsContext = useContext(SettingsContext);
    const appOptions = props.storeAppOptions;

    let _canHelp = true,
        _canFeedback = true;

    if (!appOptions.isDisconnected && appOptions.customization) {
        _canHelp = appOptions.customization.help !== false;
        _canFeedback = (
            appOptions.customization.feedback !== false &&
            appOptions.customization.feedback.visible !== false
        );
    }

    return (
        <Page>
            <Navbar title={_t.textHelpFeedback} backLink={_t.textBack} />
            <List>
                {_canFeedback &&
                    <ListItem
                        title={_t.textContactSupport}
                        link="#"
                        className='no-indicator'
                        onClick={settingsContext.showFeedback}
                    >
                        {Device.ios ?
                            <SvgIcon slot="media" symbolId={IconFeedbackForIos.id} className={'icon icon-svg'} /> :
                            <SvgIcon slot="media" symbolId={IconFeedbackForAndroid.id} className={'icon icon-svg'} />
                        }
                    </ListItem>
                }
                {_canHelp &&
                    <ListItem
                        title={_t.textHelpCenter}
                        link="#"
                        className='no-indicator'
                        onClick={settingsContext.showHelp}
                    >
                        <SvgIcon slot="media" symbolId={IconHelp.id} className={'icon icon-svg'} />
                    </ListItem>
                }
            </List>
        </Page>
    );
}));

export default HelpFeedbackView;

