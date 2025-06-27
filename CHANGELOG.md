# Version 13.01

v13 Compatibility

Changed the Vision entry from GM to Controlled to better reflect that the vision was based on the controlled token

Added the option to change the screen based on the GM controlled token.  With a setting to limit it to just friendly tokens.

Adjusted the Combat display to only show active combatants rather than the full list and setting the scroll top.

Added the option to automatically close an Image Popup when the GM closes the Popup.

Added option to expand the chat log to support v13 sidebar

Included code to avoid panning to a hidden combatant

Added additonal exceptions

# Version 12.01

v12 Compatibility

Added tooltip to describe what the icons mean

Fixed issue where clicking on the header wasn't opening a context menu with options

Fixed issue with figuring out the screen size when a token moves

Fixed issue when the scale changes but the tokens don't move, not animating to the scale changes

Updated the screen padding option to handle less padding

# Version 11.07

Added support for Storyteller

# Version 11.06

Fixed issue with targeting a token when there's no active combat.

Added smalltime, bossbar, and conversation hud to module exceptions.

# Version 11.03

Updated combat view to alter the view field to include targeted tokens.

Cleaned up warning associated with changes made to Combat Details.

# Version 11.02

Fixed issue where a blank setting wasn't defaulting the icon properly.

Added the option to set the screen to be the entire scene, in case you have a splash screen.

Changed the select token button to allow you to select multiple tokens, before pressing the button to select them.

Allowed the combat carosel to be shown.

Fixed issue where the context menu was being hidden behind other windows.

Added the option to toggle hiding ui elements on or off.  So you have have control of the other display, while still showing all the tools.

Added the option to set how much padding you want around your party.

Added the option to exclude the chat bar from calculating positioning.  So tokens won't get hidden under the chat log if you want to keep that visible.

Fixed issue where defeated tokens were still being tracked for positioning.

# Version 11.01

Adding support for v11

# Version 10.2

Fixed an issue where the toolbar wouldn't stay minimised

Added the option to have the settings per scene or one setting overall.

Added the option to select an actor to focus on, rather than just a token.  So you can switch scenes and it will still follow the appropriate token.

Added the option to set the screen size pased on the party.  So it will maintain a viewport that all tokens the display player has limited or greater access to will show.

Fixed issue with initial positioning.

Added the option to click on the screen or vision headers to select what type of view.  Instead of having to right click to get the menu up.

Fixed an issue with the toolbar wandering slightly to the right.

Fixed issue with combat tracker never disappearing when requested to not be shown.

Fixed issue with the size of the toolbat in Call of Cthulu

Fixed issue with common display button in the minimal ui interface

Removed the error message that a token doesn't have vision on a scene.

Fixed issue with auto closing an image popout when opened from the Image Popout instead of a Journal.

Added key bindings for closing journals or closing images.

# Version 10.1

Totally updated the interface.  
You can now show a control bar that lets you select if you want the display screen to mirror, the GM, mirror the current combatant, or mirror a specific token.
You can also set which token has control focus on it.  The one the current GM has selected, the current combatant, or a specific token.

You can toggle if you want either the screen or focus to be active by clicking on the image, and you can change the type of each by right clicking.

The settings to turn a player into the common display is now in the settings.  And the toggle on the toolbar opens up the window with all the controls.

You can also toggle a player being the Common Display by right clicking on the player name in the player list and selecting "Show As Common Display"

You can also clear all images and all journals from buttons on the control window, and you can set shared images to clear after a certain number of seconds.

# Version 1.0.14

Added v10 support.

# Version 1.0.12

Added support for levels 3D and chat videos, thank you vexofp for the code update

Added support for scaling the combat tracker, thank you vexofp

# Version 1.0.11

Fixed some v9 styling changes that was preventing the chat log from being revealed.

# Version 1.0.10

Adding v9 support, which boils down to hotkey support and changes with how the layer is registered

# Version 1.0.9

Added combat carosel support

Automatically popout the combat display if the common display is reloaded and there's an active combat

Added option to limit the number of combatants displayed when displaying all combatants, and scrolling the active combatant to the top.

Added option to close all open journal entries.

# Version 1.0.8
Added option to show all combatants not just the active one.

Added update so that Enhanced Journal Slideshows will be displayed.

# Version 1.0.7
Added option to include Assistant GM players in the list of players that can be used for the Common Display.

# Version 1.0.6
Merged code to support token selection mirroring.  Thank you Jixxus for the code.

# Version 1.0.5
Fixed issues with the layer

# Version 1.0.4
Changes to support 0.8.x

# Version 1.0.3
Fixed issue where the chat window wasn't hiding after a refresh

# Version 1.0.2
Added support for Health Estimate

# Version 1.0.1
Added hotkey support for changing Mirror Screen setting

Adding support for Image Hover module

Changed the design so instead of adding a comma separated list of player names in the config settings, I added a window to be able to change all the settings on the fly.  So you can turn the display settings on and off while running the game.  You can also turn off screen mirroring for specific displays, and clear images for specific displays.  This update will also remember if the player was set as a display last session and disable the UI immediately when loading.  It should provide a cleaner experience.
