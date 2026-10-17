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

            // Also listen for escape key to exit Zen mode
            $(document).on('keydown.zenmode', _.bind(this._onKeyDown, this));
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
                this.overlay.$el.addClass('visible');
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

            // Hide the Zen mode overlay first
            if (this.overlay) {
                this.overlay.hide();
                this.overlay.$el.removeClass('visible');
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
            if (this.isZenMode && e.keyCode === Common.UI.Keys.ESC) {
                this.exit();
                e.preventDefault();
                e.stopPropagation();
            }
        }

    }, Common.Controllers.ZenMode || {}));

    return Common.Controllers.ZenMode;
});
