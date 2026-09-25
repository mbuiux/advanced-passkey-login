/**
 * Auto-save settings/advanced tab fields via AJAX, with toast feedback.
 */
(function () {
    'use strict';

    var DEBOUNCE_MS = 600;
    var TOAST_SUCCESS_MS = 4000;
    var TOAST_ERROR_MS = 8000;

    var pendingSaves = {};
    var inFlightControllers = {};

    // ── Toast ───────────────────────────────────────────────────────────────

    function getToastStack() {
        return document.getElementById('advapafo-toast-stack');
    }

    function showToast(message, type) {
        var stack = getToastStack();
        if (!stack) return;

        var toast = document.createElement('div');
        toast.className = 'advapafo-toast advapafo-toast--' + (type || 'success');
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

        var text = document.createElement('p');
        text.className = 'advapafo-toast__message';
        text.textContent = message;

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'advapafo-toast__close';
        close.setAttribute('aria-label', 'Dismiss');
        close.textContent = '\u00d7';

        toast.appendChild(text);
        toast.appendChild(close);
        stack.appendChild(toast);

        // Force layout before adding the visible class so the transition runs.
        window.requestAnimationFrame(function () {
            toast.classList.add('is-visible');
        });

        var dismissTimer = window.setTimeout(function () {
            dismissToast(toast);
        }, type === 'error' ? TOAST_ERROR_MS : TOAST_SUCCESS_MS);

        close.addEventListener('click', function () {
            window.clearTimeout(dismissTimer);
            dismissToast(toast);
        });
    }

    function dismissToast(toast) {
        toast.classList.remove('is-visible');
        window.setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 200);
    }

    // ── AJAX ────────────────────────────────────────────────────────────────

    function appendOptionValue(data, value) {
        if (Array.isArray(value)) {
            value.forEach(function (item) {
                data.append('option_value[]', item);
            });
        } else {
            data.append('option_value', value);
        }
    }

    function saveOption(optionName, value, signal) {
        var config = window.ADVAPAFOSettingsAutosave;
        var data = new FormData();
        data.append('action', 'advapafo_autosave_setting');
        data.append('nonce', config.nonce);
        data.append('option_name', optionName);
        appendOptionValue(data, value);

        return fetch(config.ajaxUrl, {
            method: 'POST',
            credentials: 'same-origin',
            body: data,
            signal: signal,
        }).then(function (resp) {
            return resp.text().then(function (rawText) {
                var payload;
                try {
                    payload = JSON.parse(rawText);
                } catch (e) {
                    throw new Error(config.messages.failed);
                }

                if (!resp.ok || !payload || !payload.success) {
                    throw new Error((payload && payload.data && payload.data.message) || config.messages.failed);
                }

                return payload.data;
            });
        });
    }

    function handleSaveError(err) {
        if (err && err.name === 'AbortError') return;
        var config = window.ADVAPAFOSettingsAutosave;
        var message = (err && err.message) || config.messages.network;
        showToast(message, 'error');
    }

    function syncSeparatorDependency(conditionalEnabled, data) {
        if (typeof data.show_separator_effective === 'undefined') return;

        var separatorInput = document.querySelector('input[name="advapafo_show_separator"]');
        if (!separatorInput) return;

        separatorInput.checked = !!data.show_separator_effective;
        separatorInput.disabled = conditionalEnabled;
    }

    // `silent` suppresses the success toast for debounce-fired saves so mid-typing
    // autosaves (which may briefly save a clamped/partial value) don't pop a
    // confirmation; the blur/change-triggered "final" save always shows one.
    // Errors are always surfaced regardless of `silent`.
    function submitField(optionName, value, opts) {
        var silent = !!(opts && opts.silent);

        if (inFlightControllers[optionName]) {
            inFlightControllers[optionName].abort();
        }

        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        inFlightControllers[optionName] = controller;

        saveOption(optionName, value, controller ? controller.signal : undefined)
            .then(function (data) {
                var config = window.ADVAPAFOSettingsAutosave;
                if (!silent) {
                    showToast(config.messages.saved, 'success');
                }
                if (optionName === 'advapafo_conditional_ui_enabled') {
                    syncSeparatorDependency('1' === String(value), data);
                }
            })
            .catch(handleSaveError)
            .finally(function () {
                if (inFlightControllers[optionName] === controller) {
                    delete inFlightControllers[optionName];
                }
            });
    }

    function debounceField(optionName, value) {
        if (pendingSaves[optionName]) {
            window.clearTimeout(pendingSaves[optionName].timer);
        }

        var timer = window.setTimeout(function () {
            delete pendingSaves[optionName];
            submitField(optionName, value, { silent: true });
        }, DEBOUNCE_MS);

        pendingSaves[optionName] = { timer: timer, value: value };
    }

    function flushField(optionName, value) {
        if (pendingSaves[optionName]) {
            window.clearTimeout(pendingSaves[optionName].timer);
            delete pendingSaves[optionName];
        }
        submitField(optionName, value, { silent: false });
    }

    // Best-effort flush of any still-pending debounced saves when the page is
    // being hidden/unloaded, since a fast tab-close can otherwise drop the
    // last few keystrokes before the debounce timer would have fired.
    function flushPendingSavesViaBeacon() {
        if (!navigator.sendBeacon) return;
        var config = window.ADVAPAFOSettingsAutosave;
        if (!config) return;

        Object.keys(pendingSaves).forEach(function (optionName) {
            var pending = pendingSaves[optionName];
            window.clearTimeout(pending.timer);
            delete pendingSaves[optionName];

            var data = new FormData();
            data.append('action', 'advapafo_autosave_setting');
            data.append('nonce', config.nonce);
            data.append('option_name', optionName);
            appendOptionValue(data, pending.value);

            navigator.sendBeacon(config.ajaxUrl, data);
        });
    }

    // ── Field wiring ────────────────────────────────────────────────────────

    function isManaged(el) {
        return el.disabled || el.readOnly;
    }

    function wireCheckboxOrSelect(el) {
        el.addEventListener('change', function () {
            var value = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
            flushField(el.name, value);
        });
    }

    function wireTextOrNumber(el) {
        el.addEventListener('input', function () {
            debounceField(el.name, el.value);
        });
        el.addEventListener('blur', function () {
            flushField(el.name, el.value);
        });
    }

    function wireRoleGrid(container) {
        var checkboxes = Array.prototype.slice.call(
            container.querySelectorAll('input[name="advapafo_eligible_roles[]"]')
        );
        if (!checkboxes.length) return;

        checkboxes.forEach(function (checkbox) {
            if (isManaged(checkbox)) return;
            checkbox.addEventListener('change', function () {
                var checked = checkboxes.filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.value; });
                flushField('advapafo_eligible_roles', checked);
            });
        });
    }

    function init() {
        if (!window.ADVAPAFOSettingsAutosave) return;

        var container = document.querySelector('.advapafo-settings-form');
        if (!container) return;

        wireRoleGrid(container);

        var fields = Array.prototype.slice.call(
            container.querySelectorAll('input[type="checkbox"]:not([name="advapafo_eligible_roles[]"]), select')
        );
        fields.forEach(function (el) {
            if (isManaged(el) || !el.name) return;
            wireCheckboxOrSelect(el);
        });

        var textFields = Array.prototype.slice.call(
            container.querySelectorAll('input[type="text"], input[type="number"]')
        );
        textFields.forEach(function (el) {
            if (isManaged(el) || !el.name) return;
            wireTextOrNumber(el);
        });
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            flushPendingSavesViaBeacon();
        }
    });
    window.addEventListener('pagehide', flushPendingSavesViaBeacon);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
