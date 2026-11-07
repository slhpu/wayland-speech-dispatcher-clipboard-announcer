Clipboard Announcer for Orca Screen Reader

A GNOME Shell extension designed for Wayland that automatically announces copied text, single files, folders, or multiple items via Speech Dispatcher (spd-say) to support Orca screen reader users.

Features:

Automatic speech notifications when text, files, or folders are copied to the clipboard.

On-demand clipboard inspection shortcut to read current clipboard contents or item counts.

GNOME Preferences integration with speech rate adjustment controls and customizable keybindings.

Installation:

Clone or download this repository into your local GNOME extensions directory: git clone https://github.com/your-username/gnome-clipboard-announcer.git ~/.local/share/gnome-shell/extensions/clipboard-announcer@accessibility.local

Compile the GSettings schema files: glib-compile-schemas ~/.local/share/gnome-shell/extensions/clipboard-announcer@accessibility.local/schemas/
(note: you may need to delete the schemas.compiled file in the schemas folder first)

Restart GNOME Shell (or log out and back in on Wayland).

Enable the extension using Extension Manager or via terminal: gnome-extensions enable clipboard-announcer@accessibility.local

License: This project is licensed under the GNU General Public License v3.0.
