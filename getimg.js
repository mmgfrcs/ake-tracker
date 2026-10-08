import fs from 'fs'
import path from 'path'
import { Readable } from 'stream';
import { finished } from 'stream/promises'

const categories = [
  { name: "Weapon_icons", directory: "weapons" },
  { name: "Character_icons", directory: "chars" },
]

for (const category of categories) {
  const a = await fetch(`https://endfield.wiki.gg/api.php?action=query&gcmlimit=max&gcmnamespace=6&gcmtitle=Category%3A${category.name}&generator=categorymembers&prop=revisions&rvprop=content&format=json`)
  const result = await a.json()
  const titles = Object.keys(result.query.pages).map(x=>result.query.pages[x].title)

  console.log(titles)

  let delay = -1000

  const urlResult = await Promise.all(titles.map(async x=>{
    const u = new URL("https://endfield.wiki.gg/api.php")
    u.searchParams.append("action", "query")
    u.searchParams.append("prop", "imageinfo")
    u.searchParams.append("iiprop", "url")
    u.searchParams.append("format", "json")
    u.searchParams.append("titles", x)

    delay += 1000

    await new Promise(res => setTimeout(() => {
      console.log("Start fetch", x);
      res();
    }, delay));
    const y = await fetch(u);
    return await y.json()
  }))

  const urls = urlResult.flatMap(x=>Object.keys(x.query.pages).map(y=>x.query.pages[y].imageinfo[0].url))

  await Promise.all(urls.map(async e => {
    console.log("Downloading", e)
    const name = path.basename(e.split("?")[0]).replace("icon", "").replaceAll("_", "").replaceAll(/[^a-z0-9]/gi, "").toLowerCase()
    fs.mkdirSync(`./src/assets/${category.directory}`, {recursive: true})
    const stream = fs.createWriteStream(`./src/assets/${category.directory}/${name}`)
    const x = await fetch(e, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" } })
    if(x.ok)
      await finished(Readable.fromWeb(x.body).pipe(stream))
    else console.error(x.status, await x.json())
    return stream.close()
  }))
}