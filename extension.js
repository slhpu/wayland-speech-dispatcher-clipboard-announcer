import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ClipboardAnnouncerExtension extends Extension {
    enable() {
        this._active = true; 

        // Ensure that the timer to silence the first clipboard ownership change in the boot sequence does not get re-triggered by lock screen or wake
        if (ClipboardAnnouncerExtension._hasBooted === undefined) {
            ClipboardAnnouncerExtension._hasBooted = false;
        }

        this._settings = this.getSettings();
        this._clipboard = St.Clipboard.get_default();
        this._selection = global.display.get_selection();
        
        this._lastClipboardContent = '';
        this._timeoutId = 0;
        this._startupTimeoutId = 0;

        //Timer to silence the first clipboard ownership change not triggered by user action during the boot / login sequence
        if (!ClipboardAnnouncerExtension._hasBooted) {
            this._startupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10000, () => {
                this._startupTimeoutId = 0;
                ClipboardAnnouncerExtension._hasBooted = true;
                return GLib.SOURCE_REMOVE;
            });
        }

        this._cancellable = new Gio.Cancellable();

        // Register custom keyboard shortcut to inspect current clipboard contents on demand
        Main.wm.addKeybinding(
            'inspect-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._inspectClipboard()
        );

        // Listen for selection owner changes (monitor clipboard update events)
        this._selectionOwnerId = this._selection.connect('owner-changed', (selection, type, owner) => {
            if (!this._active) return;

            if (type === Meta.SelectionType.SELECTION_CLIPBOARD) {
                if (!ClipboardAnnouncerExtension._hasBooted) {
                    return;
                }

                this._queueClipboardChange();
            }
        });
    }

    disable() {
        this._active = false; 

        // Cancel pending asynchronous operations
        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }

        // Disconnect display selection signals
        if (this._selectionOwnerId && this._selection) {
            this._selection.disconnect(this._selectionOwnerId);
            this._selectionOwnerId = 0;
        }

        // Clear active timeout loops
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        if (this._startupTimeoutId) {
            GLib.source_remove(this._startupTimeoutId);
            this._startupTimeoutId = 0;
        }

        // Remove shortcut keybinding mapping
        Main.wm.removeKeybinding('inspect-shortcut');

        this._settings = null;
        this._clipboard = null;
        this._selection = null;
    }

    // Debounce clipboard updates to prevent duplicate or rapid-fire trigger signals
    _queueClipboardChange() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
        }

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            this._timeoutId = 0;
            
            if (!this._active) return GLib.SOURCE_REMOVE;

            try {
                this._handleClipboardChange();
            } catch (e) {
                console.error(`ClipboardAnnouncer: Error handling clipboard change: ${e.message}`);
            }
            
            return GLib.SOURCE_REMOVE;
        });
    }

    // Evaluate copied content type (text vs files/folders) and trigger automatic screen reader announcement
    _handleClipboardChange() {
        if (!this._active || !this._clipboard || !this._cancellable) return;

        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (!this._active || (this._cancellable && this._cancellable.is_cancelled())) return;

            if (!text || text === this._lastClipboardContent) {
                return;
            }
            this._lastClipboardContent = text;

            let trimmed = text.trim();
            let lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            
            let fileCount = 0;
            let folderCount = 0;
            let lastSingleName = "";
            let isFileSelection = false;

            // Parse lines to check if URIs point to local files or directories
            for (let line of lines) {
                let uri = line;
                
                if (uri.startsWith('file://')) {
                    isFileSelection = true;
                } else if (uri.startsWith('/')) {
                    uri = `file://${uri}`;
                    isFileSelection = true;
                } else {
                    continue;
                }

                try {
                    let decodedUri = decodeURIComponent(uri);
                    let file = Gio.File.new_for_uri(decodedUri);
                    
                    if (file.query_exists(null)) {
                        let info = file.query_info('standard::type,standard::display-name', Gio.FileQueryInfoFlags.NONE, null);
                        let fileType = info.get_file_type();
                        let name = info.get_display_name() || file.get_basename();

                        if (fileType === Gio.FileType.DIRECTORY) {
                            folderCount++;
                            lastSingleName = name;
                        } else {
                            fileCount++;
                            lastSingleName = name;
                        }
                    }
                } catch (e) {
                    console.error(`ClipboardAnnouncer: Failed to query file ${uri}: ${e.message}`);
                }
            }

            let announcement = "text added to clipboard";

            // Format automatic announcement based on file/folder count logic
            if (isFileSelection && (fileCount > 0 || folderCount > 0)) {
                if (fileCount === 1 && folderCount === 0) {
                    announcement = `file ${lastSingleName} added to clipboard`;
                } else if (folderCount === 1 && fileCount === 0) {
                    announcement = `folder ${lastSingleName} added to clipboard`;
                } else if (fileCount > 0 && folderCount > 0) {
                    announcement = `${fileCount} files and ${folderCount} folders added to clipboard`;
                } else if (fileCount > 1) {
                    announcement = `${fileCount} files added to clipboard`;
                } else if (folderCount > 1) {
                    announcement = `${folderCount} folders added to clipboard`;
                }
            }

            this._speakFeedback(announcement);
        });
    }

    // Inspect current clipboard contents on-demand via shortcut keybinding (truncates text to 30 chars or reads item counts)
    _inspectClipboard() {
        if (!this._active || !this._clipboard) return;

        this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (!this._active) return;

            if (!text || text.trim() === '') {
                this._speakFeedback("clipboard is empty");
                return;
            }

            let trimmed = text.trim();
            let lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            
            let fileCount = 0;
            let folderCount = 0;
            let lastSingleName = "";
            let isFileSelection = false;

            for (let line of lines) {
                let uri = line;
                
                if (uri.startsWith('file://')) {
                    isFileSelection = true;
                } else if (uri.startsWith('/')) {
                    uri = `file://${uri}`;
                    isFileSelection = true;
                } else {
                    continue;
                }

                try {
                    let decodedUri = decodeURIComponent(uri);
                    let file = Gio.File.new_for_uri(decodedUri);
                    
                    if (file.query_exists(null)) {
                        let info = file.query_info('standard::type,standard::display-name', Gio.FileQueryInfoFlags.NONE, null);
                        let fileType = info.get_file_type();
                        let name = info.get_display_name() || file.get_basename();

                        if (fileType === Gio.FileType.DIRECTORY) {
                            folderCount++;
                            lastSingleName = name;
                        } else {
                            fileCount++;
                            lastSingleName = name;
                        }
                    }
                } catch (e) {
                    // Fallback if file query fails
                }
            }

            let announcement = "";

            if (isFileSelection && (fileCount > 0 || folderCount > 0)) {
                if (fileCount === 1 && folderCount === 0) {
                    announcement = `Clipboard contains file ${lastSingleName}`;
                } else if (folderCount === 1 && folderCount === 0) {
                    announcement = `Clipboard contains folder ${lastSingleName}`;
                } else if (fileCount > 0 && folderCount > 0) {
                    announcement = `Clipboard contains ${fileCount} files and ${folderCount} folders`;
                } else if (fileCount > 1) {
                    announcement = `Clipboard contains ${fileCount} files`;
                } else if (folderCount > 1) {
                    announcement = `Clipboard contains ${folderCount} folders`;
                }
            } else {
                // Read out up to the first 30 characters for text inspection
                if (trimmed.length > 30) {
                    announcement = trimmed.substring(0, 50);
                } else {
                    announcement = trimmed;
                }
            }

            this._speakFeedback(announcement);
        });
    }

    // Send speech feedback strings to Speech Dispatcher using user-configured speech rate offset
    _speakFeedback(message) {
        if (!this._active || !this._settings) return;

        const rate = this._settings.get_int('speech-rate').toString();
        
        try {
            let proc = new Gio.Subprocess({
                argv: ['spd-say', '-P', 'notification', '-r', rate, message],
                flags: Gio.SubprocessFlags.NONE,
            });
            proc.init(null);
            proc.wait_async(null, null);
        } catch (e) {
            console.error(`ClipboardAnnouncer: Failed to call Speech Dispatcher: ${e.message}`);
        }
    }
}

