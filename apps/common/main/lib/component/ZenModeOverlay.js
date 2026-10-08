/**
 * ZenModeOverlay - Overlay component for Zen mode
 *
 * This component provides an overlay that appears when entering Zen mode.
 * It contains controls for exiting Zen mode and can be extended with
 * additional controls like zoom in the future.
 */

define([
    'common/main/lib/component/BaseView',
    'common/main/lib/component/Button'
], function() {
    'use strict';

    Common.UI.ZenModeOverlay = Common.UI.BaseView.extend({
        className: 'zen-mode-overlay',

        initialize: function(options) {
            Common.UI.BaseView.prototype.initialize.call(this, options);
            this.options = this.options || {};

            this.exitButton = new Common.UI.Button({
                id: 'zen-mode-exit-btn',
                cls: 'btn-toolbar zen-mode-exit-btn',
                iconCls: 'btn-preview-exit-fullscreen',
                onlyIcon: true,
                hint: this.options.exitButtonHint ||
                    (Common.Locale.get('textExitZenMode', {name: 'Common.Translation', default: 'Exit Zen Mode'}) + ' (Esc)'),
                hintAnchor: 'top',
                dataHint: '0',
                dataHintDirection: 'top'
            });

            this.exitButton.on('click', this.onExitClick, this);
        },

        render: function() {
            var me = this;
            me.$el.html([
                '<div class="zen-mode-overlay-inner">',
                    '<div class="zen-mode-overlay-content"></div>',
                '</div>'
            ].join(''));

            me.exitButton.render(me.$el.find('.zen-mode-overlay-content'));

            return this;
        },

        onExitClick: function(e) {
            this.fireEvent('zenmode:exit', [this]);
        }
    });

    return Common.UI.ZenModeOverlay;
});
