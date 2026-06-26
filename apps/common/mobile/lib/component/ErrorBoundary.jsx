import React from 'react';
import { f7 } from 'framework7-react';
import i18next from 'i18next';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        const text = (error ? error.toString() : null) || this.props.message || i18next.t('Error.unknownErrorText');

        const onClose = () => {
            if (Common.Gateway?.requestClose) {
                Common.Gateway.requestClose();
            } else {
                window.location.href = '/';
            }
        };

        if (f7?.dialog) {
            f7.dialog.create({
                cssClass: 'error-dialog',
                title: i18next.t('Error.criticalErrorTitle'),
                text: `<div class="error-dialog__code">${text}</div>`,
                buttons: [
                    { text: i18next.t('Error.textOk'), onClick: onClose },
                ],
            }).open();
        } else {
            window.alert(text);
            onClose();
        }
    }

    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

export default ErrorBoundary;
