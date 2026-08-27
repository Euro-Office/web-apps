import React from 'react';
import SvgIcon from './SvgIcon';
import { Device } from '../../utils/device';

export default function PlatformIcon({ ios, android, className = 'icon icon-svg', ...props }) {
    const icon = Device.ios ? ios : android;
    return <SvgIcon symbolId={icon.id} className={className} {...props} />;
}
