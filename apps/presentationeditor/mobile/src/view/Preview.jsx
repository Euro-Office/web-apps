import React, { useMemo } from 'react';
import SvgIcon from '@common/lib/component/SvgIcon';
import IconMediaPrevious from '@icons/icon-media-previous.svg';
import IconMediaPause from '@icons/icon-media-pause.svg';
import IconMediaPlay from '@icons/icon-media-play.svg';
import IconMediaNext from '@icons/icon-media-next.svg';
import IconClose from '@common-android-icons/icon-close.svg';
import {Device} from "../../../../common/mobile/utils/device";

const NavControls = ({ t, isPlaying, onPrev, onNext, onTogglePlay }) => (
    <>
        <button className="pe-preview__btn" aria-label={t.textPreviousSlide} onClick={onPrev}>
            <SvgIcon symbolId={IconMediaPrevious.id} className={'icon icon-svg'}/>
        </button>
        <button className="pe-preview__btn" aria-label={isPlaying ? t.textPause : t.textPlay} onClick={onTogglePlay}>
            <SvgIcon symbolId={(isPlaying ? IconMediaPause : IconMediaPlay).id} className={'icon icon-svg'}/>
        </button>
        <button className="pe-preview__btn" aria-label={t.textNextSlide} onClick={onNext}>
            <SvgIcon symbolId={IconMediaNext.id} className={'icon icon-svg'}/>
        </button>
    </>
);

const Preview = ({
    t,
    currentSlide,
    countPages,
    isPlaying,
    isBarsShown,
    isAtEnd,
    onClose,
    onPrev,
    onNext,
    onTogglePlay,
}) => {
    const counter = useMemo(() => (t.textSlideXofY || 'Slide {0} of {1}')
        .replace('{0}', countPages > 0 ? Math.min(currentSlide + 1, countPages) : 0)
        .replace('{1}', countPages),
    [t.textSlideXofY, currentSlide, countPages]);

    const rootClass = ['pe-preview'];
    if (!isBarsShown) rootClass.push('bars-hidden');
    if (Device.isTablet) rootClass.push('is-tablet');
    if (isAtEnd) rootClass.push('is-at-end');

    return (
        <div id="pe-preview" className={rootClass.join(' ')}>
            <div className="pe-preview__top-bar">
                <button className="pe-preview__btn pe-preview__close" aria-label={t.textClose} onClick={onClose}>
                    {Device.ios ? <span>{t.textClose}</span> : <SvgIcon symbolId={IconClose.id} className={'icon icon-svg'}/>}
                </button>
                <span className="pe-preview__counter">{counter}</span>
                <div className="pe-preview__top-controls">
                    <NavControls t={t} isPlaying={isPlaying} onPrev={onPrev} onNext={onNext} onTogglePlay={onTogglePlay}/>
                </div>
            </div>
            <div id="presentation-preview" className="pe-preview__canvas"/>
            <div className="pe-preview__bottom-bar">
                <NavControls t={t} isPlaying={isPlaying} onPrev={onPrev} onNext={onNext} onTogglePlay={onTogglePlay}/>
            </div>
        </div>
    );
};

export default Preview;
