Clipboard Announcer for Orca Screen Reader

A GNOME Shell extension designed for Wayland that automatically announces copied text, single files, folders, or multiple items via Speech Dispatcher (spd-say) to support Orca screen reader users.

Note on limitations: This extension relies on clipboard ownership changes within the gnome compositor under wayland, without getting too technical, this means that it will only announce a copy or cut event once, as the clipboard content will not change after it has been populated. So if you press your shortcut and get silence, use the inspect clipboard content keyboard shortcut provided to check the clipboard contents with speech feedback.

The extension also cannot distinguish between a copy or cut event under wayland, and cannot announce paste events, as these are still restricted to the application being pasted into, but it is still a big step up from total silence and more useful in my oppinion than something like gpaste.

Features:

Automatic speech notifications when text, files, or folders are copied to the clipboard.

On-demand clipboard inspection shortcut to read current clipboard contents or item counts.

By default this keyboard shortcut is; Ctrl + Super + c

This can be changed in the preferences.

Preferences slider to adjust the voice rate, set to 50 by default.

Installation:

Clone or download this repository into your local GNOME extensions directory: 

`git clone https://github.com/your-username/wayland-speech-dispatcher-clipboard-announcer.git ~/.local/share/gnome-shell/extensions/clipboard-announcer@accessibility.local`

The schemas file should already be compiled in the schemas folder, you can check for it by looking for gschemas.compiled in the schemas folder, if it is not their or the extension errors, delete the file and compile the schema.

`glib-compile-schemas ~/.local/share/gnome-shell/extensions/clipboard-announcer@accessibility.local/schemas/`

Restart GNOME Shell or log out and back in.

Enable the extension using Extension Manager or via terminal: 

`gnome-extensions enable clipboard-announcer@accessibility.local`

License: This project is licensed under the GNU General Public License v3.0.

About: This extension was built using the help of AI tools, but has been checked and edited by the author.

I will not be updating this extension regularly except for my own use, as I do not have the expertise or time to take on a full extension maintainer role. 
If anyone would like to fork this extension and package and maintain it for download through the extension manager then please do so with my thanks.
