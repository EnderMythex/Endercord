# EnderCord

EnderCord is a personal fork of [PawsomeVencord](https://github.com/enzomtpYT/PawsomeVencord).

## Making your own plugins

Open Discord settings, go to **EnderCord Settings > My Plugins** and type a name to create a plugin. It lands in `src/userplugins/<name>/index.tsx`. Edit that file, then click **Rebuild and Restart** (or run `pnpm build`) to load it. This tab only shows up when EnderCord runs from a source checkout, not from the standalone installer.

## Note, this is an unofficial fork of equicord. This repo might be behind the main repo at times.

- Not to mention that this fork is pretty much only being maintained by 2 people LOL

![](https://img.shields.io/github/package-json/v/enzomtpYT/PawsomeVencord?style=for-the-badge&logo=github&logoColor=d3869b&label=&color=1d2021&labelColor=282828)

PawsomeVencord is a fork of [Equicord](https://github.com/equicord/equicord), with over 300+ plugins.

You can join our [discord server](https://discord.gg/w9jVtzNx4c) for commits, changes, chat or even support.

### Included Plugins

Standard Equicord and Vencord plugins can be browsed [here](https://equicord.org/plugins).

Additionally, PawsomeVencord includes 14 exclusive or customized plugins (located in `src/pawsomeplugins/`), badged with the Pawsome logo in the client settings and filterable via the **Show PawsomeVencord** filter:

- **alwaysPing**: Always ping users when replying.
- **bark**: Adds a chatbar button to bark in chat.
- **betterClips**: Enhanced clips controls and options.
- **betterMicrophone** *(Desktop)*: Further customize your microphone settings.
- **betterScreenshare** *(Desktop)*: Further customize screen sharing resolution and frame rates.
- **bigFileUpload**: Upload large files via external file hosts through `/fileupload` or the chat button.
- **customVcNarrator**: Voice channel narrator with TikTok TTS for joins, leaves, and moves.
- **fakeDeafen**: Appears deafened while still hearing voice channels.
- **meow**: Adds a chatbar button with random meow sounds and messages.
- **notifyUserChanges**: Context menu option to receive notifications on voice channel or status changes.
- **philsPluginLibrary**: Shared helper library for Phil's plugins.
- **serverProfilesToolbox**: Adds copy, paste, and reset buttons to the server profiles editor.
- **VenPlugPlus**: Enhanced plugin management utilities.
- **webcamStartNotifier**: Alerts when cameras turn on in voice channels.

## Installing / Uninstalling

Download the [EnderCord Installer](https://github.com/EnderMythex/EndercordInstaller):

| | Windows | macOS | Linux |
| --- | --- | --- | --- |
| GUI | [x64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstaller.exe) / [ARM64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstaller-arm64.exe) | [Universal](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstaller-macos.zip) | [x64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstaller-linux) / [ARM64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstaller-linux-arm64) |
| CLI | [x64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstallerCli.exe) / [ARM64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstallerCli-arm64.exe) | [Universal](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstallerCli-universal) | [x64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstallerCli-linux) / [ARM64](https://github.com/EnderMythex/EndercordInstaller/releases/latest/download/EndercordInstallerCli-linux-arm64) |

On macOS and Linux, run `chmod +x <file>` after downloading the CLI. On Linux you can also run:

```shell
sh -c "$(curl -sS https://raw.githubusercontent.com/EnderMythex/EndercordInstaller/main/install.sh)"
```

## Installing the EnderCord Devbuild

### Dependencies

[Git](https://git-scm.com/download) and [Node.JS LTS](https://nodejs.dev/en/) are required.

Install `pnpm`:

> :exclamation: This next command may need to be run as admin/root depending on your system, and you may need to close and reopen your terminal for pnpm to be in your PATH.

```shell
npm i -g pnpm
```

> :exclamation: **IMPORTANT** Make sure you aren't using an admin/root terminal from here onwards. It **will** mess up your Discord/EnderCord instance and you **will** most likely have to reinstall.

Clone EnderCord:

```shell
git clone https://github.com/EnderMythex/Endercord
cd Endercord
```

Install dependencies:

```shell
pnpm install --frozen-lockfile
```

Build EnderCord:

```shell
pnpm build
```

Inject EnderCord into your desktop client:

```shell
pnpm inject
```

Build EnderCord for web:

```shell
pnpm buildWeb
```

After building EnderCord's web extension, locate the appropriate ZIP file in the `dist` directory and follow your browser’s guide for installing custom extensions, if supported.

Note: Firefox extension zip requires Firefox for developers

## Credits

Thank you to [Equicord](https://github.com/equicord), [Vendicated](https://github.com/Vendicated) for creating [Vencord](https://github.com/Vendicated/Vencord) & [Suncord](https://github.com/verticalsync/Suncord) by [verticalsync](https://github.com/verticalsync) for helping when needed.

## Disclaimer

Discord is trademark of Discord Inc., and solely mentioned for the sake of descriptivity.
Mentioning it does not imply any affiliation with or endorsement by Discord Inc.
Vencord is not connected to PawsomeVencord and as such, all donation links go to Vendicated's donation link.

<details>
<summary>Using PawsomeVencord violates Discord's terms of service</summary>

Client modifications are against Discord’s Terms of Service.

However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods! So you should generally be fine if you don’t use plugins that implement abusive behaviour. But no worries, all inbuilt plugins are safe to use!

Regardless, if your account is essential to you and getting disabled would be a disaster for you, you should probably not use any client mods (not exclusive to PawsomeVencord), just to be safe

Additionally, make sure not to post screenshots with PawsomeVencord in a server where you might get banned for it

</details>
