# Arknights: Endfield Pull Tracker

![](docs/example.png)

A local-first pull tracker for Arknights: Endfield. The whole site is packed to a single HTML file

Uses [Alpine.js](https://alpinejs.dev/) and [Oat](https://oat.ink/) and powered by Vite.

## Installation and Deployment
Requires pnpm v10 and node v24

- Install dependencies with `pnpm install`
- Build it with `pnpm build`
- The site is available at `dist` folder as a single HTML file, ready to open and use

## Features & Usage

After building the site, open the resulting `index.html` file on your browser, which should land you on the site homepage. You can ignore all the other files in the folder; those are not required for a functioning site, but you may want them if you are going to deploy it as it is deployed on Github Pages.

Alternatively, you can visit the site [here](https://mmgfrcs.github.io/ake-tracker/)

### Uploading New Pulls

To upload your pulls, you need to grab your pulls from the Arknights: Endfield servers first. The PowerShell script `get-record.ps1` will grab it for you and save it to a JSON file.

You can download the script from the repo, right-click on it and click Run with PowerShell &gt; Open (if you're on Windows), or run the following command on the PowerShell terminal:

```powershell
iwr -useb https://raw.githubusercontent.com/mmgfrcs/ake-tracker/9fb63b409cecb681afa62ccc893113e03757f0ae/get-record.ps1 | iex
```
> Pinned to commit 9fb63b409cecb681afa62ccc893113e03757f0ae (Fix Array Init in Script) as of writing this README file

> [!WARNING]
> Make sure the URL you use in the command is *pinned* to a commit like the above example

After you have your JSON file - saved by the script in the directory you run the command at, named `akerecord.json`, you can then load it on the site, in the Submit New Pulls section.

### Data Persistence

Data is by default not permanently persisted. It will be removed when the site is unused, or when the browser needs more storage.

For Firefox users, simply click "Enable" on the Data Persistence Disabled banner, click "Yes" on the dialog that appears, then allow the permission when the browser asks you.

For Chromium-based browser users, however, you need to add the site to your home screen before the browser will approve the permission. Just click on "Install App" on your browser and install it to your home screen.

### Data Sync

The Data Sync feature allows you to synchronize your pull data across different devices. It uses WebRTC to 
facilitate browser-to-browser communication, the same technology used for Zoom calls.

To enable it, open the Data Sync section, type a name for the current device (can be anything), and click Activate.

Please note that this feature is not a backup replacement. Please back up your data regularly.
