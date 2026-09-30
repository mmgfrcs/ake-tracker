import fs from 'fs'
import path from 'path'
import { Readable } from 'stream';
import { finished } from 'stream/promises'

const a = await fetch("https://endfield.wiki.gg/api.php?action=query&gcmlimit=max&gcmnamespace=6&gcmtitle=Category%3AWeapon_icons&generator=categorymembers&prop=revisions&rvprop=content&format=json")

const result = await a.json()

const titles = Object.keys(result.query.pages).map(x=>result.query.pages[x].title)

let delay = -1000

const urlResult = await Promise.all(titles.map(x=>{
  const u = new URL("https://endfield.wiki.gg/api.php")
  u.searchParams.append("action", "query")
  u.searchParams.append("prop", "imageinfo")
  u.searchParams.append("iiprop", "url")
  u.searchParams.append("format", "json")
  u.searchParams.append("titles", x)

  delay += 1000
  
  return new Promise(res=>setTimeout(()=>{
    console.log("Start fetch", x)
    res()
  }, delay)).then(() => fetch(u, {headers: {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"}})).then(y=>y.json())
}))

const urls = urlResult.flatMap(x=>Object.keys(x.query.pages).map(y=>x.query.pages[y].imageinfo[0].url))

await Promise.all(urls.map(async e => {
  console.log("Downloading", e)
  const name = path.basename(e.split("?")[0]).replace("icon", "").replaceAll("_", "").replaceAll(/[^a-z0-9]/gi, "").toLowerCase()
  fs.mkdirSync("./src/assets/weapons", {recursive: true})
  const stream = fs.createWriteStream(`./src/assets/weapons/${name}`)
  const x = await fetch(e, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36" } })
  if(x.ok)
    await finished(Readable.fromWeb(x.body).pipe(stream))
  else console.error(x.status, await x.json())
  return stream.close()
}))

//Generate a commit message for the staged changes. Start the message with the main action of the commit (Update, Add, Create, Fix, etc). Add a list of the summary of changes. Do not over-describe - prefer simple explanations