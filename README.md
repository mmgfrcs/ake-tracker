# Arknights: Endfield Pull Tracker

![](docs/example.png)

A local-first pull tracker for Arknights: Endfield. The whole site is packed to a single HTML file

Uses [Alpine.js](https://alpinejs.dev/) and [Oat](https://oat.ink/) and powered by Vite.

## Installation and Deployment
Requires pnpm v10 and node v24

- Install dependencies with `pnpm install`
- Build it with `pnpm build`
- The site is available at `dist` folder as a single HTML file, ready to open and use

## Features

- Saves your pull history so you can see it anytime, even when the game erased it after 6 months.
- Tracks total pulls, approximate Origometry spent, and obtainment rates for both Characters and Weapons.
- Shows current pity counts e.g., 80-pull pity and tracking for the 120-pull guarantee on specific banners so you don't have to open the game to find it out.
- Automatically calculates your Average Pity for 6-star pulls and tracks your 50:50 Win Rate on limited banners.
- Categorizes your pulls by its banners, with visual indicators for rarity.
- Displays a visual summary of your owned characters and weapons, including duplicate counts.

## Usage

After building the site, open the resulting `index.html` file on your browser, which should land you on the site homepage. You can ignore all the other files in the folder; those are not required for a functioning site, but you may want them if you are going to deploy it as it is deployed on this repo's Github Pages.

Alternatively, you can visit the site [here](https://mmgfrcs.github.io/ake-tracker/)

### Uploading New Pulls

To upload your pulls, you need to grab your pulls from the Arknights: Endfield servers first. The PowerShell script `get-record.ps1` will grab it for you and save it to a JSON file.

You can download the script from the repo, right-click on it and click Run with PowerShell &gt; Open (if you're on Windows), or run the following command on the PowerShell terminal:

```powershell
iwr -useb https://raw.githubusercontent.com/mmgfrcs/ake-tracker/19a21ea3ae83b2bea035ca1111127eda09062eb9/get-record.ps1 | iex
```
> Pinned to commit 19a21ea3ae83b2bea035ca1111127eda09062eb9 (Fix Empty Pool Types from the API) as of writing this README file

> [!WARNING]
> Make sure the URL you use in the command is *pinned* to a commit like the above example

After you have your JSON file - saved by the script in the directory you run the command at, named `akerecord.json`, you can then load it on the site, in the Submit New Pulls section.

### Data Persistence

Since the data lives in your browser, there's a problem due to how browsers manage their storage. Data is by default not permanently persisted, since [browsers would clear out its storage when you have a low disk space or when the site is unused for a long time](https://web.dev/articles/persistent-storage#check_if_your_sites_storage_has_been_marked_as_persistent:~:text=When%20faced%20with%20storage%20pressure%20like%20low%20disk%20space%2C%20browsers%20will%20typically%20evict%20data%2C%20including%20from%20the%20Cache%20API%20and%20IndexedDB%2C%20from%20the%20least%20recently%20used%20origin). It will be removed when the site is unused, or when the browser needs more storage.

For Firefox users, simply click "Enable" on the Data Persistence Disabled banner, click "Yes" on the dialog that appears, then allow the permission when the browser asks you.

For Chromium-based browser users, however, you need to add the site to your home screen before the browser will approve the permission. Just click on "Install App" on your browser and install it to your home screen, then open the app from your home screen and do the above.

Do note that allowing this permission is currently *permanent* and there's no way to turn this off.

### Data Sync

The Data Sync feature allows you to synchronize your pull data across different devices. It uses WebRTC to 
facilitate browser-to-browser communication, the same technology used for Zoom calls.

To enable it, open the Data Sync section, type a name for the current device (can be anything), and click Activate.

Please note that this feature is not a backup replacement. Please back up your data regularly.
