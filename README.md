Lumikasa game project

You can add stages by dropping image files into the game when stage select window is open
- Opaque pixels are interpreted as collision data
- Fully transparent pixels are interpreted as non-collision data

Known issues:
- Gamepads might not get reassigned to correct players if identical gamepads are being connected
- Adventure mode levels can crash the game on lower-end devices (very large level images)
- Adding a very large image into stage select can crash the game
- Performance issues on chromium-based browsers
- Game audio can break randomly?
- Frame counter inaccurate?

Incompatible gamepads:
- Microsoft SideWinder Freestyle Pro (incompatible axes)
