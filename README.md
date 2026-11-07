Clipboard Announcer for Orca Screen Reader

A GNOME Shell extension designed for Wayland that automatically announces copied text, single files, folders, or multiple items via Speech Dispatcher (spd-say) to support Orca screen reader users.

Features:

Automatic speech notifications when text, files, or folders are copied to the clipboard.

On-demand clipboard inspection shortcut to read current clipboard contents or item counts.

GNOME Preferences integration with speech rate adjustment controls and customizable keybindings.

Installation:

Clone or download this repository into your local GNOME extensions directory: git clone https://github.com/your-username/wayland-speech-dispatcher-clipboard-announcer.git ~/.local/share/gnome-shell/extensions/clipboard-announcer@accessibility.local

The schemas file should already be compiled in the schemas folder, you can check for it by looking for schemas.compiled if it is not their or the extension errors, delete the file and compile the schema.
Compile the GSettings schema files: glib-compile-schemas ~/.local/share/gnome-shell/extensions/clipboard-announcer@accessibility.local/schemas/


Restart GNOME Shell (or log out and back in on Wayland).

Enable the extension using Extension Manager or via terminal: gnome-extensions enable clipboard-announcer@accessibility.local

License: This project is licensed under the GNU General Public License v3.0.

I will not be updating this extension regularly except for my own use, as I do not have the expertise or time to take on a full extension maintainer role. 
If anyone would like to fork this extension and package and maintain it for use in the extension store then please do so with my thanks.
