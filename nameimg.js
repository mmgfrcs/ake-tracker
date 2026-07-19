import fs from 'fs'
import sharp from 'sharp'

await Promise.all(fs.readdirSync("./src/assets/chars").map(async x=> {
  if(x.endsWith(".webp")) return
  await sharp("./src/assets/chars/"+x)
      .resize(72)
      .webp({ quality: 80 })
      .toFile("./src/assets/chars/"+x.split(".")[0]+".webp", (err, info) => {
        if (err) console.error(err)
        else {
          console.log("Optimized", x, info)
          fs.rmSync("./src/assets/chars/"+x)
        }
      })
}))

await Promise.all(fs.readdirSync("./src/assets/weapons").map(async x=> {
  if(x.endsWith(".webp")) return
  await sharp("./src/assets/weapons/"+x)
      .resize(128)
      .webp({ quality: 80 })
      .toFile("./src/assets/weapons/"+x.split(".")[0]+".webp", (err, info) => {
    if (err) console.error(err)
    else {
      console.log("Optimized", x, info)
      fs.rmSync("./src/assets/weapons/"+x)
    }
  })
}))

await Promise.all(fs.readdirSync("./src/assets/banners").map(async x=> {
  if(x.endsWith(".webp")) return
  await sharp("./src/assets/banners/"+x)
      .resize(1280)
      .webp({ quality: 80 })
      .toFile("./src/assets/banners/"+x.split(".")[0]+".webp", (err, info) => {
    if (err) console.error(err)
    else {
      console.log("Optimized", x, info)
      fs.rmSync("./src/assets/banners/"+x)
    }
  })
}))