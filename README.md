# Arknights: Endfield Pull Tracker

![](docs/example.png)

A local-first pull tracker for Arknights: Endfield. The whole site is packed to a single HTML file

Uses [Alpine.js](https://alpinejs.dev/) and [Oat](https://oat.ink/) and powered by Vite.

## Installation and Deployment
Requires pnpm v10 and node v24

- Install dependencies with `pnpm install`
- Build it with `pnpm build`
- The site is available at `dist` folder as a single HTML file, ready to open and use

## Usage

After building the site, open the resulting `index.html` file on your browser, which should land you on the site homepage.

Alternatively, you can visit the site [here](https://mmgfrcs.github.io/ake-tracker/)

### Uploading New Pulls

To upload your pulls, you need to grab your pulls from the Arknights: Endfield servers first. The PowerShell script `get-record.ps1` will grab it for you and save it to a JSON file.

You can download the script from the repo, right-click on it and click Run with PowerShell &gt; Open (if you're on Windows), or run the following command on the PowerShell terminal:

```powershell
iwr -useb https://raw.githubusercontent.com/mmgfrcs/ake-tracker/cbb9fb411e50f4d50d555d535a51c256b9f7ad2a/get-record.ps1 | iex
```
> Pinned to commit cbb9fb411e50f4d50d555d535a51c256b9f7ad2a (Fix Script Output Encoding) as of writing this README file

> [!WARNING]
> Make sure the URL you use in the command is *pinned* to a commit like the above example

After you have your JSON file - saved by the script in the directory you run the command at, named `akerecord.json`, you can then load it on the site, in the Submit New Pulls section.