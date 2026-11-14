import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const genParam = (type, name, ...dflt) => GObject.ParamSpec[type](name, name, name, GObject.ParamFlags.READWRITE, ...dflt);

export default class ClipboardAnnouncerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let settings = this.getSettings();
        let page = new Adw.PreferencesPage();

        // Inspect clipboard contents keyboard shortcut
        const deleteInspectButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['error'],
            hexpand: false,
            vexpand: false,
            tooltip_text: 'Delete clipboard inspection shortcut'
        });

        let groupShortcut = new Adw.PreferencesGroup({
            title: 'Clipboard Inspection Shortcut',
            header_suffix: deleteInspectButton
        });

        const inspectShortcutKeyBoard = new ShortcutSettingWidget(
            settings,
            'inspect-shortcut',
            'Inspect Clipboard Shortcut',
            'Press Enter to set or change shortcut'
        );

        if (!inspectShortcutKeyBoard.isAcceleratorSet()) {
            deleteInspectButton.visible = false;
        }

        deleteInspectButton.connect('clicked', () => {
            inspectShortcutKeyBoard.resetAccelerator();
        });

        settings.connect('changed::inspect-shortcut', () => {
            if (inspectShortcutKeyBoard.isAcceleratorSet()) {
                deleteInspectButton.visible = true;
            } else {
                deleteInspectButton.visible = false;
            }
        });

        groupShortcut.add(inspectShortcutKeyBoard);
        page.add(groupShortcut);

        // Spin button to choose maximum characters for clipboard inspection shortcut to announce in text
        let lengthGroup = new Adw.PreferencesGroup({
            title: 'Inspection Character Limit'
        });

        let lengthRow = new Adw.ActionRow({
            title: 'Maximum Characters to Announce',
            subtitle: 'Sets the maximum number of characters spoken when inspecting text clipboard content'
        });

        let lengthAdjustment = new Gtk.Adjustment({
            lower: 10,
            upper: 500,
            step_increment: 5,
            page_increment: 25,
            value: settings.get_int('max-trim-length')
        });

        let spinButton = new Gtk.SpinButton({
            adjustment: lengthAdjustment,
            numeric: true,
            valign: Gtk.Align.CENTER
        });

        lengthAdjustment.connect('value-changed', (adj) => {
            settings.set_int('max-trim-length', Math.round(adj.get_value()));
        });

        lengthRow.add_suffix(spinButton);
        lengthGroup.add(lengthRow);
        page.add(lengthGroup);

        // Voice rate slider
        let speechGroup = new Adw.PreferencesGroup({
            title: 'Voice Rate Settings'
        });

        let rateRow = new Adw.ActionRow({
            title: 'Voice Rate Adjustment',
            subtitle: 'Alters the speech rate of the speech dispatcher voice output using up/down arrows or page up/page down'
        });

        let adjustment = new Gtk.Adjustment({
            lower: -100,
            upper: 100,
            step_increment: 1,
            page_increment: 5,
            value: settings.get_int('speech-rate')
        });

        let scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adjustment,
            digits: 0,
            value_pos: Gtk.PositionType.RIGHT,
            draw_value: true,
            hexpand: true,
            valign: Gtk.Align.CENTER
        });
        scale.set_size_request(200, -1);

        adjustment.connect('value-changed', (adj) => {
            settings.set_int('speech-rate', Math.round(adj.get_value()));
        });

        rateRow.add_suffix(scale);
        speechGroup.add(rateRow);
        page.add(speechGroup);

        window.add(page);
    }
}

// Custom Shortcut Setting Widget for capturing GTK accelerators safely in preferences
const ShortcutSettingWidget = class extends Adw.ActionRow {
    static {
        GObject.registerClass({
            Properties: {
                shortcut: genParam('string', 'shortcut', '')
            },
            Signals: {
                changed: { param_types: [GObject.TYPE_STRING] }
            }
        }, this);
    }

    constructor(settings, key, label, sublabel) {
        super({
            title: label,
            subtitle: sublabel,
            activatable: true
        });

        this.shortcutBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            spacing: 5,
            hexpand: false,
            vexpand: false
        });

        this._key = key;
        this._settings = settings;
        this._description = sublabel;

        this.shortLabel = new Gtk.ShortcutLabel({
            disabled_text: 'New accelerator…',
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false
        });

        this.shortcutBox.append(this.shortLabel);

        this.connect('activated', this._onActivated.bind(this));
        this.bind_property('shortcut', this.shortLabel, 'accelerator', GObject.BindingFlags.DEFAULT);
        
        let [savedAccel] = this._settings.get_strv(this._key);
        this.shortcut = savedAccel || '';

        this.add_suffix(this.shortcutBox);
    }

    isAcceleratorSet() {
        let [val] = this._settings.get_strv(this._key);
        return Boolean(val && val.trim() !== '');
    }

    resetAccelerator() {
        this.saveShortcut();
    }

    _onActivated(widget) {
        const ctl = new Gtk.EventControllerKey();

        const content = new Adw.StatusPage({
            title: 'New accelerator…',
            description: this._description,
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic'
        });

        this._editor = new Adw.Window({
            modal: true,
            hide_on_close: true,
            transient_for: widget.get_root(),
            width_request: 480,
            height_request: 320,
            content
        });

        this._editor.add_controller(ctl);
        ctl.connect('key-pressed', this._onKeyPressed.bind(this));
        this._editor.present();
    }

    _onKeyPressed(_widget, keyval, keycode, state) {
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        if (!mask && keyval === Gdk.KEY_Escape) {
            this._editor.close();
            return Gdk.EVENT_STOP;
        }

        if (keyval === Gdk.KEY_BackSpace) {
            this.saveShortcut();
            return Gdk.EVENT_STOP;
        }

        if (!this.isValidBinding(mask, keycode, keyval) || !this.isValidAccel(mask, keyval)) {
            return Gdk.EVENT_STOP;
        }

        this.saveShortcut(keyval, keycode, mask);
        return Gdk.EVENT_STOP;
    }

    saveShortcut(keyval, keycode, mask) {
        if (!keyval && !keycode) {
            this.shortcut = '';
        } else {
            this.shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
        }

        this.emit('changed', this.shortcut);
        this._settings.set_strv(this._key, [this.shortcut]);
        this._editor.destroy();
    }

    keyvalIsForbidden(keyval) {
        return [
            Gdk.KEY_Home,
            Gdk.KEY_Left,
            Gdk.KEY_Up,
            Gdk.KEY_Right,
            Gdk.KEY_Down,
            Gdk.KEY_Page_Up,
            Gdk.KEY_Page_Down,
            Gdk.KEY_End,
            Gdk.KEY_Tab,
            Gdk.KEY_KP_Enter,
            Gdk.KEY_Return,
            Gdk.KEY_Mode_switch
        ].includes(keyval);
    }

    isValidBinding(mask, keycode, keyval) {
        return !(mask === 0 || (mask === Gdk.ModifierType.SHIFT_MASK && keycode !== 0 &&
                 ((keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
                     (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
                     (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
                     (keyval === Gdk.KEY_space && mask === 0) || this.keyvalIsForbidden(keyval)))
        );
    }

    isValidAccel(mask, keyval) {
        return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
    }
};

