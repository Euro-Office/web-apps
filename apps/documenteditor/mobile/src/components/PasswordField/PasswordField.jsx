import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Device } from '../../../../../common/mobile/utils/device';
import SvgIcon from '@common/lib/component/SvgIcon';
import IconShowPasswordAndroid from '@common-android-icons/icon-show-password.svg';
import IconHidePasswordAndroid from '@common-android-icons/icon-hide-password.svg';
import IconShowPasswordIos from '@common-ios-icons/icon-show-password.svg';
import IconHidePasswordIos from '@common-ios-icons/icon-hide-password.svg';

const PasswordField = ({ label, placeholder, value, handlerChange, maxLength }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState(value);
    const [isShowPassword, setShowPassword] = useState(false);
    const isIos = Device.ios;

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        handlerChange(e.target.value);
    };

    const toggleShowPassword = () => {
        setShowPassword(!isShowPassword);
    };

    const IconShow = isIos ? IconShowPasswordIos : IconShowPasswordAndroid;
    const IconHide = isIos ? IconHidePasswordIos : IconHidePasswordAndroid;

    return (
        <li>
            <div className='item-content item-input password-field'>
                <div className='item-inner'>
                    <div className='item-title item-label password-field__label'>{label}</div>
                    <div className='item-input-wrap password-field__wrap'>
                        <input type={isShowPassword ? 'text' : 'password'} placeholder={placeholder} value={password} onChange={handlePasswordChange} className='password-field__input' maxLength={maxLength || null} />
                        <button
                            type='button'
                            onClick={toggleShowPassword}
                            aria-pressed={isShowPassword}
                            aria-label={isShowPassword ? t('Settings.textHidePassword') : t('Settings.textShowPassword')}
                            className='password-field__toggle'
                        >
                            <SvgIcon symbolId={isShowPassword ? IconHide.id : IconShow.id} className='password-field__icon icon icon-svg' />
                        </button>
                    </div>
                </div>
            </div>
        </li>
    );
};

export default PasswordField;
