import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { observer, inject } from 'mobx-react';
import Preview from "../view/Preview";
import ContextMenu from './ContextMenu';

const PreviewController = inject('storeToolbarSettings')(observer(props => {
    const { t } = useTranslation();
    const _t = t('View.Edit', {returnObjects: true});
    const { countPages } = props.storeToolbarSettings;

    let _view, _touches, _touchStart, _touchEnd;

    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isBarsShown, setIsBarsShown] = useState(true);
    const [isAtEnd, setIsAtEnd] = useState(false);

    useEffect(() => {
        const onDocumentReady = () => {
            const api = Common.EditorApi.get();

            api.asc_registerCallback('asc_onEndDemonstration', onEndDemonstration);
            api.asc_registerCallback('asc_onDemonstrationSlideChanged', onSlideChanged);
            api.DemonstrationEndShowMessage(_t.textFinalMessage);
        };

        ContextMenu.closeContextMenu();

        _view = $$('#presentation-preview');
        _view.on('touchstart', onTouchStart);
        _view.on('touchmove', onTouchMove);
        _view.on('touchend', onTouchEnd);

        show();
        onDocumentReady();

        return () => {
            const api = Common.EditorApi.get();

            api.asc_unregisterCallback('asc_onEndDemonstration', onEndDemonstration);
            api.asc_unregisterCallback('asc_onDemonstrationSlideChanged', onSlideChanged);

            _view.off('touchstart', onTouchStart);
            _view.off('touchmove', onTouchMove);
            _view.off('touchend', onTouchEnd);
        };
    }, []);

    const enterFullScreen = element => {
        if(element) {
            if(element.requestFullscreen) {
                element.requestFullscreen();
            } else if(element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if(element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if(element.msRequestFullscreen) {
                element.msRequestFullscreen();
            } else {
                console.error('Full screen API is not supported in this browser.');
            }
        }
    };

    const exitFullScreen = () => {
        if(document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if(document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        } else if(document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if(document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
            console.error('Full screen exit API is not supported in this browser.');
        }
    };

    const show = () => {
        const api = Common.EditorApi.get();
        const pePreview = $$('#pe-preview')[0];
        api.StartDemonstrationFromCurrentSlide('presentation-preview');
        enterFullScreen(pePreview);
    };

    const onTouchStart = e => {
        e.preventDefault();

        _touches = [];

        for (let i = 0; i < e.touches.length; i++) {
            _touches.push([e.touches[i].pageX, e.touches[i].pageY]);
        }
        _touchEnd = _touchStart = [e.touches[0].pageX, e.touches[0].pageY];
    };

    const onTouchMove = e => {
        e.preventDefault();

        const api = Common.EditorApi.get();

        _touchEnd = [e.touches[0].pageX, e.touches[0].pageY];

        if (e.touches.length < 2 ) return;

        for (let i = 0; i < e.touches.length; i++) {
            if (Math.abs(e.touches[i].pageX - _touches[i][0]) > 20 || Math.abs(e.touches[i].pageY - _touches[i][1]) > 20 ) {
                api.EndDemonstration();
                break;
            }
        }
    };

    const onTouchEnd = e => {
        e.preventDefault();
        if (!isAtEnd) {
            setIsBarsShown(prev => !prev);
        }
    };

    // API Handlers

    const onEndDemonstration = () => {
        props.closeOptions('preview');
        exitFullScreen();
    };

    const onSlideChanged = slideNum => {
        setCurrentSlide(slideNum);
        const atEnd = slideNum >= countPages;
        setIsAtEnd(atEnd);
        if (atEnd) {
            setIsBarsShown(true);
        }
    };

    // UI Handlers

    const onClose = () => {
        const api = Common.EditorApi.get();
        api.EndDemonstration();
    };

    const onPrev = () => {
        const api = Common.EditorApi.get();
        api.DemonstrationPrevSlide();
    };

    const onNext = () => {
        const api = Common.EditorApi.get();
        api.DemonstrationNextSlide();
    };

    const onTogglePlay = () => {
        setIsPlaying(!isPlaying);
        const api = Common.EditorApi.get();
        if (isPlaying) {
            api.DemonstrationPause();
        } else {
            api.DemonstrationPlay();
        }
    };

    return (
        <Preview
            t={_t}
            currentSlide={currentSlide}
            countPages={countPages}
            isPlaying={isPlaying}
            isBarsShown={isBarsShown}
            isAtEnd={isAtEnd}
            onClose={onClose}
            onPrev={onPrev}
            onNext={onNext}
            onTogglePlay={onTogglePlay}
        />
    );
}));

export {PreviewController as Preview};
