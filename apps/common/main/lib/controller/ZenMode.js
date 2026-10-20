/**
 * ZenMode Controller
 *
 * Manages Zen mode for the editor. When activated, it hides all toolbars
 * (header, left menu, right menu, statusbar) and rulers to provide a clean,
 * distraction-free view of the document.
 *
 * Elements to be hidden in Zen mode should have the class 'zen-mode-hideable'.
 * The controller toggles the 'zen-mode' class on body, and CSS handles
 * hiding all elements with '.zen-mode-hideable' via:
 *   .zen-mode .zen-mode-hideable { display: none !important; }
 *
 * Events (Common.NotificationCenter):
 *   'zenmode:request' - command: request entering (true) or leaving (false) Zen mode
 *   'zenmode:changed' - status: broadcast after Zen mode was entered (true) or left (false)
 */

if (Common === undefined)
    var Common = {};
Common.Controllers = Common.Controllers || {};

define([
    'core',
    'jquery',
    'underscore',
    'backbone',
    'common/main/lib/component/ZenModeOverlay'
], function (core, $, _, Backbone) {
    'use strict';

    Common.Controllers.ZenMode = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [],

        initialize: function() {
            this.isZenMode = false;
            this.overlay = null;

            // Listen for Zen mode requests
            Common.NotificationCenter.on('zenmode:request', _.bind(this._onZenModeRequest, this));

            // Escape exits Zen mode; the handler is bound while Zen mode is active
            // so that handlers registered earlier (the editor itself) see the key first
            this._onKeyDown = _.bind(this._onKeyDown, this);
        },

        onLaunch: function() {
            // Create the Zen mode overlay
            this.overlay = new Common.UI.ZenModeOverlay();
            this.overlay.on('zenmode:exit', _.bind(this.exit, this));
            this.overlay.render();
            $('body').append(this.overlay.$el);
        },

        /**
         * Handler for Zen mode requests
         * @param {boolean} active - true to enter, false to exit
         */
        _onZenModeRequest: function(active) {
            if (active) {
                this.enter();
            } else {
                this.exit();
            }
        },

        /**
         * Enter Zen mode
         */
        enter: function() {
            if (this.isZenMode) return;

            this.isZenMode = true;

            // Exit on Escape while Zen mode is active
            $(document).on('keydown.zenmode', this._onKeyDown);

            // Collapse an open toolbar "More" panel (narrow screens) so it does not
            // stay expanded after the toolbars are hidden and Zen mode is left again
            var toolbarController = this.getApplication().getController('Toolbar');
            toolbarController && toolbarController.toolbar && toolbarController.toolbar.hideMoreBtns &&
                toolbarController.toolbar.hideMoreBtns();

            // Add Zen mode class to body for complete coverage
            $('body').addClass('zen-mode');

            // Show the Zen mode overlay
            if (this.overlay) {
                this.overlay.show();
            }

            // Trigger window resize event to ensure all UI components update their layout
            $(window).trigger('resize');

            // Notify that Zen mode has been entered
            Common.NotificationCenter.trigger('zenmode:changed', true);
        },

        /**
         * Exit Zen mode
         */
        exit: function() {
            if (!this.isZenMode) return;

            this.isZenMode = false;

            // Stop listening for Escape
            $(document).off('keydown.zenmode', this._onKeyDown);

            // Hide the Zen mode overlay first
            if (this.overlay) {
                this.overlay.hide();
            }

            // Remove Zen mode class from body
            $('body').removeClass('zen-mode');

            // Trigger window resize event to ensure all UI components update their layout
            $(window).trigger('resize');

            // Notify that Zen mode has been exited
            Common.NotificationCenter.trigger('zenmode:changed', false);
        },

        /**
         * Handler for keyboard events (ESC to exit Zen mode)
         */
        _onKeyDown: function(e) {
            if (e.keyCode !== Common.UI.Keys.ESC) return;

            // a modal window is open: its own Esc handling (closing the dialog) wins
            if (parseInt($('.modals-mask').attr('counter') || '0', 10) > 0) return;

            // keymaster (Common.util.Shortcuts) preventDefaults every Esc that matches a
            // registered shortcut, so an already-prevented event is not a signal that the
            // editor consumed the key; Zen mode always exits on plain Esc instead
            this.exit();
            e.preventDefault();
            e.stopPropagation();
        }

    }, Common.Controllers.ZenMode || {}));

    return Common.Controllers.ZenMode;
});
