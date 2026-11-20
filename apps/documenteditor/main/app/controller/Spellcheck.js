/*
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

define([
    'core',
    'documenteditor/main/app/view/Spellcheck'
], function () {
    'use strict';

    DE.Controllers.Spellcheck = Backbone.Controller.extend(_.extend({
        models: [],
        collections: [],
        views: [
            'Spellcheck'
        ],

        initialize: function() {
            var me = this;
            this.addListeners({
                'Spellcheck': {
                    'show': function() {
                        me.onShowPanel();
                    },
                    'hide': function() {
                        me.onHidePanel();
                    }
                }
            });
        },

        onLaunch: function() {
            this.panelSpellcheck = this.createView('Spellcheck');
            this.panelSpellcheck.on('render:after', _.bind(this.onAfterRender, this));
        },

        setApi: function(api) {
            this.api = api;
            this.api.asc_registerCallback('asc_onFocusObject', _.bind(this.onFocusObject, this));
            this.api.asc_registerCallback('asc_onSpellCheckVariantsFound', _.bind(this.onSpellCheckVariantsFound, this));
            this.api.asc_registerCallback('asc_onSpellCheckProgress', _.bind(this.onSpellCheckProgress, this));
            return this;
        },

        setMode: function(mode) {
            this.mode = mode;
            return this;
        },

        onAfterRender: function(panelSpellcheck) {
            panelSpellcheck.buttonNext.on('click', _.bind(this.onClickNext, this));
            panelSpellcheck.btnToDictionary.on('click', _.bind(this.onDictionary, this));
            // Enter in the list also sends item:click
            panelSpellcheck.suggestionList.on('item:click', _.bind(this.onClickSuggestion, this));
            panelSpellcheck.btnChange.on('click', _.bind(this.onClickChange, this, false));
            panelSpellcheck.btnChangeAll.on('click', _.bind(this.onClickChange, this, true));
            panelSpellcheck.btnIgnore.on('click', _.bind(this.onClickIgnore, this, false));
            panelSpellcheck.btnIgnoreAll.on('click', _.bind(this.onClickIgnore, this, true));
            panelSpellcheck.menuMore.on('item:click', _.bind(this.onClickChangeMenu, this));
            panelSpellcheck.btnToDictionary.setVisible(!!(this.mode && this.mode.isDesktopApp));
        },

        isPanelVisible: function() {
            return this.panelSpellcheck && this.panelSpellcheck.rendered && this.panelSpellcheck.isVisible();
        },

        onShowPanel: function() {
            if (!this.api) return;
            // The background check stops after 2000 errors, the panel needs all of them
            this.api.asc_setSpellCheckErrorsLimit(false);
            var state = this.api.asc_GetSpellCheckState(true);
            this.updateMissingLanguages(state);
            this.updateProgress(state);
            this.findNext();
            this.panelSpellcheck.focus();
        },

        onHidePanel: function() {
            this._waitingForNext = false;
            this._finished = false;
            this._docChanged = false;
            this.api && this.api.asc_setSpellCheckErrorsLimit(true);
        },

        onClickNext: function() {
            this.findNext();
            this.panelSpellcheck.focus();
        },

        findNext: function() {
            if (this.api) {
                this.showSkipped(0);
                this._docChanged = false;
                // asc_nextWord sends the suggestions with asc_onSpellCheckVariantsFound, at once if they are known
                this._nextWordSpell = null;
                this._waitingVariants = true;
                var found = this.api.asc_nextWord(),
                    state = this.api.asc_GetSpellCheckState(),
                    checking = !found && !!state && !state['IsComplete'] && !state['IsStopped'];
                // Nothing found yet while the background check runs: look again when it has finished
                this._waitingForNext = checking;
                this._waitingVariants = found && !this._nextWordSpell;
                // No more words: an edit in the document after this shows that the result is out of date
                this._finished = !found && !checking;
                this.updatePanel(found ? (this._nextWordSpell || this.getSpellCheckObject()) : null, this._finished);
                state && this.updateProgress(state);
            }
        },

        onSpellCheckProgress: function(checked, total, complete, stopped) {
            this.updateProgress({'Checked': checked, 'Total': total, 'IsComplete': complete, 'IsStopped': stopped});
        },

        updateProgress: function(state) {
            var panel = this.panelSpellcheck;
            if (!this.api || !state || !this.isPanelVisible()) return;

            if (this._finished && !state['IsComplete'] && !state['IsStopped']) {
                // The document was edited after the panel had found no more words
                this._finished = false;
                this._docChanged = true;
                panel.lblComplete.addClass('hidden');
            }

            var complete = state['IsComplete'],
                percent = state['Total'] > 0 ? Math.floor(state['Checked'] * 100 / state['Total']) : 100,
                text;
            if (state['IsStopped'])
                text = panel.txtSpellcheckOff;
            else if (complete)
                text = this._docChanged ? panel.txtDocumentChanged : panel.txtCheckedAll;
            else
                text = Common.Utils.String.format(this._waitingForNext ? panel.txtStillChecking : panel.txtChecking, percent);

            panel.lblProgress.text(text);
            panel.barProgress.css('width', (complete ? 100 : percent) + '%');
            panel.barProgress.toggleClass('complete', complete && !state['IsStopped']);

            if (complete && this._lastComplete === false)
                this.updateMissingLanguages();
            this._lastComplete = complete;

            if (this._waitingForNext && (complete || state['IsStopped'])) {
                this._waitingForNext = false;
                this.findNext();
            }
        },

        updateMissingLanguages: function(state) {
            var panel = this.panelSpellcheck;
            if (!this.api || !panel || !panel.rendered) return;

            state = state || this.api.asc_GetSpellCheckState(true);
            var names = state ? _.map(state['MissingLanguages'], function(code) {
                    return Common.util.LanguageInfo.getLocalLanguageName(code)[1];
                }) : [];
            panel.lblMissingLanguages.text(names.length ? Common.Utils.String.format(panel.txtMissingLanguages, names.join(', ')) : '');
            panel.lblMissingLanguages.toggleClass('hidden', !names.length);
        },

        showSkipped: function(count) {
            var panel = this.panelSpellcheck;
            if (!panel || !panel.rendered) return;
            panel.lblSkipped.text(count > 0 ? Common.Utils.String.format(panel.txtSkippedLocked, count) : '');
            panel.lblSkipped.toggleClass('hidden', !(count > 0));
        },

        onDictionary: function() {
            if (this.api && this._currentSpellObj) {
                this.api.asc_spellCheckAddToDictionary(this._currentSpellObj);
                this.findNext();
            }
            this.panelSpellcheck.focus();
        },

        // A click on a suggestion changes the word, a click on its "..." opens the menu with Change all
        onClickSuggestion: function(list, item, record, e) {
            var more = e && $(e.target).closest('.spellcheck-more');
            if (more && more.length) {
                // the click must not reach the document, which closes open menus
                e.stopPropagation();
                this._moreRecord = record;
                // selecting the row redraws it, so the clicked "..." is no longer in the page
                this.panelSpellcheck.showMoreMenu(item.$el.find('.spellcheck-more'));
            } else {
                this.onClickChange(false, record);
            }
        },

        onClickChange: function(all, rec) {
            rec = rec && rec.get ? rec : this.panelSpellcheck.suggestionList.getSelectedRec();
            if (this.api && rec && this._currentSpellObj) {
                var result = this.api.asc_replaceMisspelledWord(rec.get('value'), this._currentSpellObj, all);
                this.findNext();
                // Words in locked content controls or in paragraphs that someone else edits are skipped
                all && result && this.showSkipped(result['Skipped']);
            }
            this.panelSpellcheck.focus();
        },

        onClickChangeMenu: function(menu, item) {
            this.onClickChange(item.value === 1, this._moreRecord);
        },

        onClickIgnore: function(all) {
            if (this.api && this._currentSpellObj) {
                this.api.asc_ignoreMisspelledWord(this._currentSpellObj, all);
                this.findNext();
            }
            this.panelSpellcheck.focus();
        },

        getSpellCheckObject: function(update) {
            var elements = this.api.getSelectedElements(update);
            for (var i = 0; elements && i < elements.length; i++) {
                if (elements[i].get_ObjectType() === Asc.c_oAscTypeSelectElement.SpellCheck) {
                    var spell = elements[i].get_ObjectValue();
                    return (spell && spell.get_Checked() === false) ? spell : null;
                }
            }
            return null;
        },

        onFocusObject: function() {
            if (this.isPanelVisible())
                this.updatePanel(this.getSpellCheckObject(), false);
        },

        isSameWord: function(spell1, spell2) {
            return !!spell1 && !!spell2 && spell1.get_Word() === spell2.get_Word() && spell1.ParaId === spell2.ParaId;
        },

        // With a word: the suggestions for the word that asc_nextWord selected.
        // Without: an answer for a request of the document itself, for example for the context menu
        onSpellCheckVariantsFound: function(spell) {
            if (!this.isPanelVisible()) return;

            if (spell) {
                this._nextWordSpell = spell;
                if (!this._currentSpellObj || this.isSameWord(spell, this._currentSpellObj)) {
                    this._waitingVariants = false;
                    this.updatePanel(spell, false);
                }
            } else if (this._currentSpellObj && !this._currentSpellObj.get_Variants()) {
                var updated = this.getSpellCheckObject(true);
                if (this.isSameWord(updated, this._currentSpellObj) && updated.get_Variants())
                    this.updatePanel(updated, false);
            }
        },

        updatePanel: function(spell, complete) {
            var panel = this.panelSpellcheck;
            if (!panel || !panel.rendered) return;

            var word = spell ? spell.get_Word() : '',
                variants = spell ? spell.get_Variants() : null,
                loading = !!spell && !variants && this._waitingVariants,
                arr = [];
            this._currentSpellObj = spell;
            panel.suggestionList.setEmptyText(loading ? panel.txtLoadingSuggestions : panel.noSuggestions);
            variants && variants.forEach(function (item) {
                arr.push(new Common.UI.DataViewModel({value: item, tip: panel.tipMoreOptions}));
            });

            panel.currentWord.setValue(word);
            panel.suggestionList.store.reset(arr);
            (arr.length > 0) && panel.suggestionList.selectByIndex(0);
            panel.currentWord.setDisabled(!word);
            panel.btnChange.setDisabled(!arr.length);
            panel.btnChangeAll.setDisabled(!arr.length);
            panel.btnIgnore.setDisabled(!word);
            panel.btnIgnoreAll.setDisabled(!word);
            panel.btnToDictionary.setDisabled(!word);
            panel.lblComplete.toggleClass('hidden', !complete);
        }

    }, DE.Controllers.Spellcheck || {}));
});
