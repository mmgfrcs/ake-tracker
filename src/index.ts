import '@knadh/oat/oat.min.css';
import './index.css'
import '@knadh/oat/oat.min.js'
import * as idb from 'idb'
import Alpine from 'alpinejs'
import icon from './assets/icon.png'
import bg from './assets/bg.webp'
import type {AKEGachaCharacter, AKEGachaRecord, AKEGachaWeapon} from './models/record';
import type {AKECharacterHistory, AKEDBSchema, AKEListCount, AKEWeaponHistory} from "./models/history.ts";
import {createIcons, Download, ImageDown, Trash2, MirrorRectangular, Star} from 'lucide';
import {registerSW} from 'virtual:pwa-register'
import {type DataConnection, Peer} from 'peerjs'
import {applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector} from 'yjs'
import type {SyncMessage} from "./models/sync.ts";
import poolInfo from './pools.json';
import satori from 'satori'

createIcons({icons: {
  Download,
  Trash2,
  ImageDown,
  MirrorRectangular,
  Star
}, inTemplates: true})

const link = document.querySelector("link[rel~='icon']");
if (link) (link as HTMLLinkElement).href = icon;
const applink = document.querySelector("link[rel~='apple-touch-icon']");
if (applink) (applink as HTMLLinkElement).href = icon;
const iconImg = document.querySelector(".icon");
if (iconImg) (iconImg as HTMLImageElement).src = icon;
const bgImg = document.querySelector("#bg-image img") as HTMLImageElement
if(bgImg) bgImg.src = bg


let db: idb.IDBPDatabase<AKEDBSchema> = await idb.openDB("akeTracker", 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("assets"))
      db.createObjectStore("assets", {
        keyPath: "id"
      })

    if (!db.objectStoreNames.contains("characters")) {
      const chrstore = db.createObjectStore("characters", {
        keyPath: "seqId"
      })

      chrstore.createIndex('name', 'name');
      chrstore.createIndex('pulledAt', 'pulledAt');
    }

    if (!db.objectStoreNames.contains("weapons")) {
      const wepstore = db.createObjectStore("weapons", {
        keyPath: "seqId"
      })

      wepstore.createIndex('name', 'name');
      wepstore.createIndex('pulledAt', 'pulledAt');
    }

  }
});

await db.clear("assets")
const assetMod = import.meta.glob("/src/assets/chars/*.webp", {import: "default"})

for(let assetPth in assetMod) {
  const name = assetPth.match(/[^/\\]+?(?=\.\w+$)/);
  if (!name) continue;

  await db.put("assets", {id: name[0], value: await assetMod[assetPth]() as string})
}

const assetWeapMod = import.meta.glob("/src/assets/weapons/*.webp", {import: "default"})

for(let assetPth in assetWeapMod) {
  const name = assetPth.match(/[^/\\]+?(?=\.\w+$)/);
  if (!name) continue;

  await db.put("assets", {id: name[0], value: await assetWeapMod[assetPth]() as string})
}

const assetBanMod = import.meta.glob("/src/assets/banners/*.webp", {import: "default"})

for(let assetPth in assetBanMod) {
  const name = assetPth.match(/[^/\\]+?(?=\.\w+$)/);
  if (!name) continue;

  await db.put("assets", {id: name[0]+".webp", value: await assetBanMod[assetPth]() as string})
}

interface SatoriElementProps {
  style?: Record<string, any>;
  children?: SatoriElement[] | string | number | boolean | null | undefined;
  [key: string]: any;
}

interface SatoriElement {
  type: string,
  props: SatoriElementProps
}

function createElement(type: string, props: SatoriElementProps, ...children: (SatoriElement | undefined)[]): SatoriElement;
function createElement(type: string, props: SatoriElementProps, children: string | number | boolean | null | undefined): SatoriElement;
function createElement(type: string, props: SatoriElementProps, ...children: (SatoriElement | string | number | boolean | null | undefined)[]): SatoriElement {
  props = props || {}

  if (children.length === 0) return {
    type: type,
    props: props
  } 

  if (children.length === 1 && !(children[0] instanceof Element)) {
    const child = children[0] as string | number | boolean | null | undefined;
    // handle single primitive child
    return {
      type: type,
      props: {...props, children: child}
    }
  }

  let flatChildren = (children as SatoriElement[]).flat(Infinity).filter((c) => c !== undefined);

  return {
    type: type,
    props: {...props, children: flatChildren}
  }
}

async function ownershipList(data: AKEListCount[], isCharacter: boolean = true) {
  return createElement(
    "div", 
    {
      style: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "flex-end",
      }
    },
    ...(await Promise.all(data.slice(0, 40)
      .map(async x=>createElement(
        "div", 
        {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            position: "relative",
            borderRadius: 10,
            overflow: "hidden",
            gap: 6,
            padding: "6px",
            background: x.rarity === 6 ? "linear-gradient(160deg, #584926 0%, #262626 100%)" : "linear-gradient(160deg, #262626 0%, #161616 100%)"
          }
        }, 
        createElement(
          "img",
          {
            src: x && (await db.get("assets", x.name.replaceAll(/[^a-z0-9]/gi, "").replaceAll(" ", "").toLowerCase()))?.value,
            alt: "Image",
            width: x.rarity === 6 ? 96 : 72,
            height: x.rarity === 6 ? 96 : 72,
            style: {
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
              overflow: "hidden"
            }
          }
        ), 
        createElement(
          "span",
          {
            style: {
              fontSize: 17,
              textOverflow: 'ellipsis',
              overflow: "hidden",
              whiteSpace: 'nowrap',
              width: x.rarity === 6 ? 96 : 72,
            }
          },
          x.name
        ), 
        createElement(
          "div",
          {
            style: {
              display: "flex",
              position: "absolute",
              bottom: 30,
              right: x.rarity === 6 ? 4 : 2,
              fontSize: 18,
              padding: 4,
              borderRadius: 8,
              backgroundColor: "#212121"
            }
          },
          isCharacter ? `P${x.count-1}` : x.count
        )
        )
      )
    )),
    data.length > 40 ? createElement(
      "div",
      {
        style: {
          fontSize: 30,
          alignSelf: "center",
          justifySelf: "center"
        }
      },
      `+${data.length - 40}`
    ) : undefined
  )
}

//@ts-ignore
window.Alpine = Alpine

Alpine.data("exporter", () => ({
  username: "",
  uid: "",
  init() {
    this.username = localStorage.getItem("export-username") ?? ""
    this.uid = localStorage.getItem("export-uid") ?? ""
    Alpine.effect(() => {
      localStorage.setItem("export-username", this.username)
      localStorage.setItem("export-uid", this.uid)
    })
  },
  showExportDialog() {
    const dialog = document.getElementById("export-dialog") as HTMLDialogElement
    const dialogForm = dialog.getElementsByTagName("form")[0]

    dialogForm.addEventListener("submit", async e => {
      //@ts-ignore e here has the correct typeE
      await this.exportAsPng(e)
    }, {once: true})
    dialog.showModal()
  },
  async exportAsPng(e: SubmitEvent & {currentTarget: HTMLFormElement}) {
    const fData = new FormData(e.currentTarget, e.submitter)
    const file = fData.get('pic') as File

    this.username = fData.get("name")?.toString() ?? ""
    this.uid = fData.get("uid")?.toString() ?? ""

    let imgBlobUrl = ""
    const pulldata = Alpine.$data(document.getElementsByTagName("main")[0]) as {
      characters: AKEListCount[],
      weapons: AKEListCount[],
      pulls: {
      weapons: Partial<Record<string, AKEWeaponHistory[]>>,
      chars: Partial<Record<string, AKECharacterHistory[]>>}
    }
    
    try {
      //@ts-ignore
      ot.toast("Exporting")

      const image = await satori(
        createElement(
          "div", 
          {
            style: {
              fontFamily: "Geist", 
              color: "white",
              background: "linear-gradient(160deg, #14161c 0%, #0e0f13 100%)", 
              display: "flex", 
              flexDirection: "column", 
              gap: "15px", 
              padding: "40px", 
              width: 1920, 
              height: 1080
            }
          }, 
          createElement(
            "div", 
            {
              style: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between"
              }
            },
            createElement(
              "div", 
              {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  gap: 13
                }
              },
              createElement(
                "img",
                {
                  src: file && file.size !== 0 && file.name !== "" ? await (file as File).arrayBuffer() : icon,
                  alt: "Image",
                  width: 120,
                  height: 120
                }
              ),
              createElement(
                "div", 
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  },
                },
                createElement("div", { style: { fontSize: "56px" } }, fData.get("name")?.toString() || ""),
                createElement(
                  "div",
                  {
                    style: {
                      fontSize: "27px",
                      padding: "6px 9px",
                      backgroundColor: "#363636",
                      borderRadius: 16,
                      flex: "1 1 0"
                    }
                  },
                  `UID ${fData.get("uid")?.toString() || "Unknown"}`
                )
              )
            ),
            createElement("div", { style: { fontSize: "38px", textAlign: "right", alignSelf: "flex-start" } }, "Ownership Report")
          ), 
          createElement("div", { style: { fontSize: "27px", paddingLeft: "12px" } }, "Owned Characters"),
          await ownershipList(pulldata.characters),
          createElement("div", { style: { fontSize: "27px", paddingLeft: "12px" } }, "Owned Weapons"),
          await ownershipList(pulldata.weapons, false),
          createElement("div", { style: { display: "flex", flexGrow: 1 } }),
          createElement(
            "div", 
            { style: { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", fontSize: 19, flex: "1 1 0" } },
            createElement("div", {}, "AKE Tracker"),
            createElement("div", {}, "© 2026 AKE Tracker · Fan-made, not affiliated with Gryphline / Hypergryph")
          )

        ),
        {
          width: 1920,
          height: 1080,
          fonts: [{
            name: "Geist",
            data: await fetch("https://cdn.jsdelivr.net/fontsource/fonts/geist@5.3.0/latin-400-normal.woff").then(x=>x.arrayBuffer()),
            weight: 400,
            style: "normal"
          }]
        }
      )
      const imgBlob = new Blob([image], { type: 'image/svg+xml;charset=utf-8' })
      imgBlobUrl = URL.createObjectURL(imgBlob)

      const img = new Image();
      img.width = 1920;
      img.height = 1080;

      img.onload = () => {
        // 3. Create an offscreen canvas and draw the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, img.width, img.height);

        // 4. Export the canvas as a PNG Data URL
        const pngDataUrl = canvas.toDataURL('image/png');

        // 5. Clean up memory and resolve
        URL.revokeObjectURL(imgBlobUrl);
        
        const downloadLink = document.createElement('a');
        downloadLink.style.display = "hidden";
        downloadLink.href = pngDataUrl;
        downloadLink.download = 'rendered-vector.png';
        downloadLink.click();
        downloadLink.remove();
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(imgBlobUrl);
        console.error(error)
      };

      img.src = imgBlobUrl;
    } catch (e) {
      console.error(e)
      if (imgBlobUrl !== "")
        URL.revokeObjectURL(imgBlobUrl)
    }
  }
}))

Alpine.data("meta", () => ({
  appVer: import.meta.env.VITE_APP_VERSION,
  gameVer: "1.4",
}))

Alpine.data("persistence", () => ({
  isPersistent: false,
  async showPersistence() {
    const decision = await new Promise<string>(res => {
      const dialog = document.getElementById("persistence-dialog") as HTMLDialogElement
      dialog.addEventListener("close", function onClose() {
        dialog.removeEventListener('close', onClose)
        res(dialog.returnValue)
      })
      dialog.showModal()
    })

    if (decision === "yes") {
      const tryPersist = await navigator.storage.persist()
      if (!tryPersist) {
        const dialog = document.getElementById("persistence-denied-dialog") as HTMLDialogElement
        dialog.showModal()
      }
      this.isPersistent = await navigator.storage.persisted()
    }
  },
  async init() {
    this.isPersistent = await navigator.storage.persisted()
  }
}))

Alpine.data("pulldata", () => ({
  async init() {
    try {
      const data = await loadData()
      this.pulls.weapons = data.weapons
      this.pulls.chars = data.characters
      this.pulls.weaponPools = data.weaponPools
      this.pulls.charPools = data.characterPools
      this.calculateStats()
      this.characters = Object.values(Object.values(data.characters).flatMap(x=>x).sort((a, b) => a.rarity > b.rarity ? -1 : 1).reduce((p, n) => {
        p[n.name] = {name: n.name, count: (p[n.name]?.count || 0) + 1, rarity: n.rarity, pool: n.poolId}
        return p
      }, <{[x: string]: AKEListCount}>{}))
      this.weapons = Object.values(Object.values(data.weapons).flatMap(x=>x).sort((a, b) => a.rarity > b.rarity ? -1 : 1).reduce((p, n) => {
        p[n.name] = {name: n.name, count: (p[n.name]?.count || 0) + 1, rarity: n.rarity, pool: n.poolId}
        return p
      }, <{[x: string]: AKEListCount}>{}))
      console.log("Load success")
      
      this.$nextTick(() => {
        const tabEl = document.getElementsByTagName('ot-tabs')
        console.log("ot-tabs: Reinitializing")
        for (let i = 0; i < tabEl.length; i++) {
          //@ts-ignore init() exists
          tabEl.item(i)?.init();
        }
      })

    } catch(e) {
      console.error(e);

      alert("Error loading data. Refresh to try again.")
    }
  },
  calculateStats() {
    this.pulls.weaponStats.pullNo = Object.values(this.pulls.weapons).reduce((p, n) => p + (n?.length ?? 0), 0)
    this.pulls.weaponStats.currencySpent = this.pulls.weaponStats.pullNo * 500
    this.pulls.weaponStats.hrObtained = Object.values(this.pulls.weapons).map(x=>x?.filter(x=>x.rarity === 6).length ?? 0).reduce((p, n) => p+n, 0)
    this.pulls.weaponStats.lrObtained = Object.values(this.pulls.weapons).map(x=>x?.filter(x=>x.rarity === 5).length ?? 0).reduce((p, n) => p+n, 0)
    
    this.pulls.charStats.pullNo = Object.values(this.pulls.chars).reduce((p, n) => p + (n?.length ?? 0), 0)
    this.pulls.charStats.currencySpent = Object.values(this.pulls.chars).reduce((p, n) => p + (n?.filter(x=>!x.isFree).length ?? 0), 0) * 500
    this.pulls.charStats.hrObtained = Object.values(this.pulls.chars).map(x=>x?.filter(x=>x.rarity === 6).length ?? 0).reduce((p, n) => p+n, 0)
    this.pulls.charStats.lrObtained = Object.values(this.pulls.chars).map(x=>x?.filter(x=>x.rarity === 5).length ?? 0).reduce((p, n) => p+n, 0)

    this.pulls.charStats.avgPity = calculateAvgPity(this.pulls.chars)
    this.pulls.weaponStats.avgPity = calculateAvgPity(this.pulls.weapons)

    this.pulls.charStats.luckWR = calculate5050WinOdds(this.pulls.chars)

  },
  getMergedPulls(pool: string, isChar: boolean = true)  {
    if (isChar) return getFilteredMergedPulls(this.pulls.chars, pool)
    else return getFilteredMergedPulls(this.pulls.weapons, pool)
  },
  getAllMergedPulls(isChar: boolean = true): (AKECharacterHistory | AKEWeaponHistory)[] {
    if (isChar) return getAllMergedPulls(this.pulls.chars)
    else return getAllMergedPulls(this.pulls.weapons)
  },
  getEntryPity<T extends AKECharacterHistory | AKEWeaponHistory>(charOrWeap: T, isChar: boolean = true) {
    if (isChar) return getEntryPity(this.pulls.chars, charOrWeap)
    else return getEntryPity(this.pulls.weapons, charOrWeap)
  },
  is5050Win<T extends AKECharacterHistory | AKEWeaponHistory>(charOrWeap: T, isChar: boolean = true) {
    if (isChar) return is5050Win(this.pulls.chars, charOrWeap)
    else return is5050Win(this.pulls.weapons, charOrWeap)
  },
  async loadUrl(e: SubmitEvent & {currentTarget: HTMLFormElement}) {
    this.urlForm.enableSubmit = false

    const fData = new FormData(e.currentTarget, e.submitter)
    const file = fData.get('file') as File

    try {
      if (file.type !== "application/json") throw new Error("Invalid type " + file.type)

      const fileCt = JSON.parse(await file.text()) as AKEGachaRecord

      const weapArr = await Promise.all(fileCt.weapons.map(async (x)=>{
        const tobj: AKEWeaponHistory = {
          id: x.weaponId,
          name: x.weaponName,
          type: x.weaponType,
          rarity: x.rarity,
          poolId: x.poolId,
          poolName: x.poolName,
          pulledAt: Number(x.gachaTs),
          seqId: Number(x.seqId)
        }

        await db.delete("weapons", Number(x.seqId))
        await db.put("weapons", tobj)
        return tobj
      }))

      this.pulls.weapons = Object.groupBy(weapArr, x=>x.poolId)

      const charArr = await Promise.all(fileCt.characters.map(async (x)=>{
        const tobj: AKECharacterHistory = {
          id: x.charId,
          name: x.charName,
          rarity: x.rarity,
          poolId: x.poolId,
          poolName: x.poolName,
          pulledAt: Number(x.gachaTs),
          seqId: Number(x.seqId),
          isFree: x.isFree
        }
        await db.delete("characters", Number(x.seqId))
        await db.put("characters", tobj)
        return tobj
      }))

      this.pulls.chars = Object.groupBy(charArr, x=>x.poolId)

      this.characters = Object.values(charArr.toSorted((a, b) => a.rarity > b.rarity ? -1 : 1).reduce((p, n) => {
        p[n.name] = {name: n.name, count: (p[n.name]?.count || 0) + 1, rarity: n.rarity, pool: n.poolId}
        return p
      }, <{[x: string]: AKEListCount}>{}))

      this.weapons = Object.values(weapArr.toSorted((a, b) => a.rarity > b.rarity ? -1 : 1).reduce((p, n) => {
        p[n.name] = {name: n.name, count: (p[n.name]?.count || 0) + 1, rarity: n.rarity, pool: n.poolId}
        return p
      }, <{[x: string]: AKEListCount}>{}))

      this.calculateStats()

      this.urlForm.message = "URL loaded"
      setTimeout(() => {
        this.urlForm.message = ""
      }, 5000)

      location.reload()

    } catch(e: any) {
      this.urlForm.error = e.message
      setTimeout(() => {
        this.urlForm.error = ""
      }, 5000);
    }

    this.urlForm.enableSubmit = true
    
  },
  async getIcon(char: AKECharacterHistory | AKEWeaponHistory) {
    return (await db.get("assets", char.name.replaceAll(/[^a-z0-9]/gi, "").replaceAll(" ", "").toLowerCase()))?.value
  },
  // Actual data
  characters: <AKEListCount[]>[],
  weapons: <AKEListCount[]>[],
  pulls: {
    weapons: <Partial<Record<string, AKEWeaponHistory[]>>>{},
    chars: <Partial<Record<string, AKECharacterHistory[]>>>{},
    weaponPools: <{id: string, name: string, info?: typeof poolInfo[0], pity: number}[]>[],
    charPools: <{id: string, name: string, info?: typeof poolInfo[0], pity: number}[]>[],
    weaponStats: {
      pullNo: 0,
      currencySpent: 0,
      hrObtained: 0,
      lrObtained: 0,
      avgPity: 0
    },
    charStats: {
      pullNo: 0,
      currencySpent: 0,
      hrObtained: 0,
      lrObtained: 0,
      avgPity: 0,
      luckWR: 0
    },
  },
  urlForm: {
    enableSubmit: true,
    error: "",
    message: ""
  }
}))

Alpine.data("backup", () => ({
  async backup() {
    console.log("Start backup")
    
    const blob = new Blob([JSON.stringify(await getDataForBackupAndSync())], {type: 'application/json'});
    const blobURL = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('href', blobURL);
    a.setAttribute('download', `akebackup-${new Date().toISOString()}.json`);
    a.style.display = 'none';
    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(blobURL);
  }
}))

Alpine.data("sync", () => ({
  peer: <Peer | null>null,
  doc: <Doc | null>null,
  enableSync: localStorage.getItem("syncId") !== null,
  remotePeers: <{id: string, device: string, approved: boolean, conn?: DataConnection, state: string}[]>[],
  id: "",
  currentDevice: "",
  async start() {
    this.id = crypto.randomUUID()
    localStorage.setItem("syncDevice", this.currentDevice)
    localStorage.setItem("syncId", this.id)
    this.enableSync = true
    await this.initPeer()
  },
  addPeer(id: string) {
    if (this.peer === null) return
    const pConn = this.setupConnection(this.peer.connect(id, {metadata: {device: this.currentDevice}}))
    this.remotePeers.push({id: id, device: "", approved: true, conn: pConn, state: "INIT"})
    this.savePeerList()
  },
  approvePeer(id: string) {
    if (this.peer === null) return
    const pConn = this.setupConnection(this.peer.connect(id, {metadata: {device: this.currentDevice}}))

    this.remotePeers = this.remotePeers.map(x=>x.id === id ? {...x, conn: pConn, approved: true} : x)
    this.savePeerList()

  },
  setupConnection(pConn: DataConnection) {
    pConn.on('open', () => {
      pConn.send(<SyncMessage>{type: "ident", origin: this.id})
      const peer = this.remotePeers.find(x=>x.id === pConn.peer)
      if (peer && peer.approved) pConn.send({type: "sync", origin: this.id})
    })
    pConn.on('data', async data => {
      const decData = data as SyncMessage
      console.log("Received data", decData, new TextDecoder().decode(decData.data))
      if (this.doc === null) {
        pConn.send(<SyncMessage>{type: "error", data: new TextEncoder().encode("EMPTY")})
        return
      }
      switch(decData.type) {
        case "ident": {
          pConn.send(<SyncMessage>{type: "ident-ack", origin: this.id, data: new TextEncoder().encode(this.currentDevice)})
          break;
        }
        case "ident-ack": {
          const peer = this.remotePeers.find(x=>x.id === pConn.peer)
          if (peer) peer.device = new TextDecoder().decode(decData.data)
          break;
        }
        case "sync": {
          const peer = this.remotePeers.find(x=>x.id === pConn.peer)
          if(!peer) break;

          peer.state = "SYNC_START"
          if(!peer.approved) {
            console.log("UNAPPROVED")
            pConn.send(<SyncMessage>{type: "error", origin: this.id, data: new TextEncoder().encode("UNAPPROVED")})
            return;
          }

          const upData = encodeStateVector(this.doc)
          console.log("Sending state vector", upData)
          pConn.send(<SyncMessage>{type: "state", origin: this.id, data: upData})
          break;
        }
        case "state": {
          if (!decData.data) {
            pConn.send(<SyncMessage>{type: "error", origin: this.id, data: new TextEncoder().encode("No state data received")})
            return;
          }
          const peer = this.remotePeers.find(x=>x.id === pConn.peer)
          if(!peer) break;

          peer.state = "SYNC_STATE"
          if(!peer.approved) {
            console.log("UNAPPROVED")
            pConn.send(<SyncMessage>{type: "error", origin: this.id, data: new TextEncoder().encode("UNAPPROVED")})
            return;
          }

          const upData = encodeStateAsUpdate(this.doc, new Uint8Array(decData.data))
          console.log("Sending update", upData)
          pConn.send(<SyncMessage>{type: "update", origin: this.id, data: upData})
          break;
        }
        case "update": {
          if (!decData.data) {
            pConn.send(<SyncMessage>{type: "error", data: new TextEncoder().encode("No update data received")})
            return;
          }
          const peer = this.remotePeers.find(x=>x.id === pConn.peer)
          if(!peer) break;

          peer.state = "SYNC_UPDATE"
          if(!peer.approved) {
            console.log("UNAPPROVED")
            pConn.send(<SyncMessage>{type: "error", origin: this.id, data: new TextEncoder().encode("UNAPPROVED")})
            return;
          }

          console.log("Applying update", decData.data)
          applyUpdate(this.doc, new Uint8Array(decData.data), decData.origin)

          const pData = this.doc.getMap("pulldata")

          const characters = pData.get("characters") as AKEGachaCharacter[]
          const weapons = pData.get("weapons") as AKEGachaWeapon[]

          await db.clear("weapons")
          await db.clear("characters")

          await Promise.all(weapons.map(async (x)=>{
            const tobj: AKEWeaponHistory = {
              id: x.weaponId,
              name: x.weaponName,
              type: x.weaponType,
              rarity: x.rarity,
              poolId: x.poolId,
              poolName: x.poolName,
              pulledAt: Number(x.gachaTs),
              seqId: Number(x.seqId)
            }

            await db.put("weapons", tobj)
            return tobj
          }))

          await Promise.all(characters.map(async (x)=>{
            const tobj: AKECharacterHistory = {
              id: x.charId,
              name: x.charName,
              rarity: x.rarity,
              poolId: x.poolId,
              poolName: x.poolName,
              pulledAt: Number(x.gachaTs),
              seqId: Number(x.seqId),
              isFree: x.isFree
            }
            await db.put("characters", tobj)
            return tobj
          }))

          this.$dispatch("data-update")
          break;
        }
        case "error": {
          const peer = this.remotePeers.find(x=>x.id === pConn.peer)
          if(!peer) break;
          const errorData = new TextDecoder().decode(decData.data)
          switch(errorData) {
            case "UNAPPROVED":
              peer.state = "UNAPPROVED"
              pConn.close()
              break;
            default:
              //@ts-ignore
              ot.toast(`Error from peer ${peer.device} (${peer.id}): ${errorData}`)
          }

          break;
        }

      }
    })

    return pConn
  },
  removePeer(id: string) {
    this.remotePeers.find(x=>x.id === id)?.conn?.close()
    this.remotePeers = this.remotePeers.filter(x=>x.id !== id)
    this.savePeerList()
  },
  async initPeer() {

    this.doc = new Doc()
    this.doc.on("update", () => {
      if (this.doc === null) return
      this.remotePeers.forEach(x=>x.approved && x.conn?.dataChannel?.readyState === "open" && x.conn?.send({type: "sync"}))
    })

    const arr = this.doc.getMap("pulldata")
    const data = await getDataForBackupAndSync()
    arr.set("characters", data.characters)
    arr.set("weapons", data.weapons)

    this.peer = new Peer(this.id)
    this.peer.on("open", (id) => {
      localStorage.setItem("syncId", id)
      console.log("PeerJS Connected")

      for (let i = 0; i < this.remotePeers.length; i++) {
        if (!this.peer || !this.remotePeers[i].approved) continue
        this.remotePeers[i].conn = this.setupConnection(this.peer.connect(this.remotePeers[i].id, {metadata: {device: this.currentDevice}}))
      }
    });

    this.peer.on("connection", conn => {
      console.log("[SYNC] Connected to peer: " + conn.peer)
      const rPeer = this.remotePeers.find(x=>x.id === conn.peer)
      if (rPeer) {
        rPeer.conn = this.setupConnection(conn)
        return
      }
      //@ts-ignore oat API that is not typed
      ot.toast(`A new connection from peer ${conn.metadata.device} (${conn.peer}) has been established. Please approve it to start syncing.`)
      this.remotePeers.push({id: conn.peer, device: conn.metadata.device, approved: false, conn: this.setupConnection(conn), state: "INIT"})
      this.savePeerList()
    })

    this.peer.on("disconnected", id => {
      console.log("[SYNC] Disconnected from peer: " + id)
      const peer = this.remotePeers.filter(x=>x.id === id)
      if (!peer) return

      this.remotePeers = this.remotePeers.filter(x=>x.id !== id)
      this.remotePeers.push(peer[0])
      this.savePeerList()
    })

    this.peer.on("error", err => {
      console.error("[SYNC] Error: " + err)
      switch(err.type) {
        case "peer-unavailable":
          const peer = this.remotePeers.find(x=>x.id === / (\S*)$/.exec(err.message)?.[1] || "")
          if (peer) peer.conn = undefined
          break;
        // case "unavailable-id":
          
      }
    })
  },
  savePeerList() {
    localStorage.setItem("syncPeers", JSON.stringify(this.remotePeers.map(x=>({id: x.id, device: x.device, approved: x.approved}))))
  },

  async init() {
    if ("userAgentData" in navigator) {
      const heData = await (navigator.userAgentData as {getHighEntropyValues: (arr: string[]) => any}).getHighEntropyValues(["model"])
      if (heData.model !== "") this.currentDevice = `${heData.model} ${heData.brands[0].brand} (${heData.platform})`
      this.currentDevice = `${heData.brands[0].brand} (${heData.platform})`
    }
    else this.currentDevice = `${navigator.userAgent} (${navigator.platform})`

    console.log("Try init sync")

    if(localStorage.getItem("syncId") === null) return

    this.id = localStorage.getItem("syncId") || ""
    this.currentDevice = localStorage.getItem("syncDevice") || ""
    this.remotePeers = JSON.parse(localStorage.getItem("syncPeers") || "[]")

    await this.initPeer()
    console.log("Sync init")
  }
}))

async function loadData() {
  if(!db) throw new Error("DB uninitialized before load");

  const weapons = await db.getAll("weapons") as AKEWeaponHistory[]
  const characters = await db.getAll("characters") as AKECharacterHistory[]

  return {
    weapons: sortKeys(Map.groupBy<string, AKEWeaponHistory>(weapons.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    characters: sortKeys(Map.groupBy<string, AKECharacterHistory>(characters.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    weaponPools: removeDupes((await Promise.all(weapons.map(async x=>{
      const inf = poolInfo.find(y=>y.name === x.poolName)
      if(inf) inf.image = (await db.get("assets", inf.image))?.value ?? ""
      return {
        id: x.poolId,
        name: x.poolName,
        info: inf
      }
    })))).map(x=>({...x, pity: calculateCurrentPity(weapons, x.id)})),

    characterPools: removeDupes((await Promise.all(characters.map(async x=>{
      const inf = poolInfo.find(y=>y.name === x.poolName)
      if(inf) inf.image = (await db.get("assets", inf.image))?.value ?? ""
      return {
        id: x.poolId,
        name: x.poolName,
        info: inf
      }
    })))).map(x=>({...x, pity: calculateCurrentPity(characters, x.id), guarantee: calculateCurrentPityGuarantee(characters, x.id)})),
  }
}

async function getDataForBackupAndSync() {
  const charArr = (await db.getAll("characters")).map(x=>(<AKEGachaCharacter>{
    charId: x.id,
    charName: x.name,
    gachaTs: x.pulledAt.toString(),
    isFree: x.isFree,
    isNew: false,
    poolId: x.poolId,
    poolName: x.poolName,
    rarity: x.rarity,
    seqId: x.seqId.toString()
  }))
  const weapArr = (await db.getAll("weapons")).map(x=>(<AKEGachaWeapon>{
    weaponId: x.id,
    weaponName: x.name,
    weaponType: x.type,
    gachaTs: x.pulledAt.toString(),
    isNew: false,
    poolId: x.poolId,
    poolName: x.poolName,
    rarity: x.rarity,
    seqId: x.seqId.toString()
  }))

  return {characters: charArr, weapons: weapArr}
}

function removeDupes(arr: any[]) {
  const seen = new Set();

  return arr.filter(el => {
    const duplicate = seen.has(el.id);
    seen.add(el.id);
    return !duplicate;
  });
}

function getEntryPity<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, AKECharacterHistory[]>>, charOrWeap: T): number;
function getEntryPity<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, AKEWeaponHistory[]>>, charOrWeap: T): number;
function getEntryPity<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, T[]>>, charOrWeap: T) {
  const mergedPulls = getFilteredMergedPulls(pool, charOrWeap.poolId)
  const currentIndex = mergedPulls.length - mergedPulls.indexOf(charOrWeap)
  const nextChar = mergedPulls.find((x, i)=>x.rarity === charOrWeap.rarity && i > mergedPulls.indexOf(charOrWeap))
  const nextIndex = nextChar ? mergedPulls.length - mergedPulls.indexOf(nextChar) : 0 
  const freeCount = mergedPulls.slice(mergedPulls.length - currentIndex, mergedPulls.length - nextIndex).filter(x=>'isFree' in x && x.isFree).length
  return currentIndex - nextIndex - freeCount
}

type DeepFlatten<T> = T extends any[]
  ? { [K in keyof T]: DeepFlatten<T[K]> }[number]
  : T;

// function getAllMergedPulls(pool: Partial<Record<string, AKECharacterHistory[]>>, isChar: true): AKECharacterHistory[]
// function getAllMergedPulls(pool: Partial<Record<string, AKEWeaponHistory[]>>, isChar: false): AKEWeaponHistory[]
function getAllMergedPulls<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, T[]>>): T[] {
  const map = Object.entries(pool)
    .map(x=>x[1] as T[])

  return (map
    .flat(20) as DeepFlatten<typeof map>[])
    .sort((a, b) => b.pulledAt - a.pulledAt || b.seqId - a.seqId)
}

function getFilteredMergedPulls<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, T[]>>, poolId: string)  {
  return (getAllMergedPulls(pool))
    .filter(x => {
      return (x.poolId.includes('special') || x.poolId.includes('joint'))
        ? (x.poolId.includes('special') || x.poolId.includes('joint'))
        : x.poolId === poolId // standard/beginner pools stay isolated, as they don't rerun
    })
}

function is5050Win<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, AKECharacterHistory[]>>, charOrWeap: T): boolean;
function is5050Win<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, AKEWeaponHistory[]>>, charOrWeap: T): boolean;
function is5050Win<T extends AKECharacterHistory|AKEWeaponHistory>(pool: Partial<Record<string, T[]>>, charOrWeap: T) {
  const lossCharacters = ['chr_0025_ardelia', 'chr_0026_lastrite', 'chr_0029_pograni', 'chr_0009_azrila', 'chr_0015_lifeng']
  if (lossCharacters.includes(charOrWeap.id)) return false
  const mergedPulls = getFilteredMergedPulls(pool, charOrWeap.poolId)
  const nextChar = mergedPulls.find((x, i)=>x.rarity === charOrWeap.rarity && i > mergedPulls.indexOf(charOrWeap))
  return !lossCharacters.includes(nextChar?.id ?? "")
}

function sortKeys<T extends AKECharacterHistory | AKEWeaponHistory>(obj: Map<string, T[]>) {
  let keys = Array.from(obj.keys())
    .filter(key => key != "standard" && key != "beginner" && !key.includes("weaponbox_constant"))
    .sort((a, b)=> {
      if(!obj.has(a) || !obj.has(b)) return 0
      if (obj.get(a)?.length === 0 || obj.get(b)?.length === 0) return 0
      if (a === "standard" || a === "beginner" || b === "standard" || b === "beginner" || a.includes("weaponbox_constant") || b.includes("weaponbox_constant")) return 1
      return obj.get(a)?.at(0)?.pulledAt && obj.get(b)?.at(0)?.pulledAt ? (obj.get(b)?.at(0)?.pulledAt ?? 0) - (obj.get(a)?.at(0)?.pulledAt ?? 0) : a > b ? -1 : 1
    })

  keys.push(...Array.from(obj.keys()).filter(key => key === "standard" || key === "beginner" || key.includes("constant")))

  return keys.reduce((acc, key) => {
      acc[key] = obj.get(key)!;
      return acc;
    }, <{[x: string]: T[]}>{});
}

function calculateAvgPity(data: Partial<Record<any, any[]>>) {
  const mergedPool = getAllMergedPulls(data)
  const merged6StarPool = mergedPool.filter(x=>x.rarity === 6)
  return merged6StarPool.map(x=> getEntryPity(data, x)).reduce((p, n) => p+n, 0) / merged6StarPool.length  
}

function calculateCurrentPity(data: (AKECharacterHistory|AKEWeaponHistory)[], banner: string) {
  if(!data || data.length === 0) return 0;

  let sortedPulls = data.filter(x=>banner.includes("special") ? x.poolId.includes("special") : x.poolId.includes("joint")).filter(x=>x.poolId !== "standard" && x.poolId !== "beginner").sort((a, b) => b.pulledAt - a.pulledAt)
  let last6StarIdx = sortedPulls.findIndex(x=>x.rarity === 6)
  if(last6StarIdx === -1) last6StarIdx = sortedPulls.length;

  last6StarIdx -= sortedPulls.slice(0, last6StarIdx).filter(x=>("isFree" in x) && x.isFree).length
  return last6StarIdx
}

function calculateCurrentPityGuarantee(data: (AKECharacterHistory|AKEWeaponHistory)[], banner: string) {
  if(!data || data.length === 0) return 0;

  const sortedPulls = data.filter(x=>x.poolId === banner).sort((a, b) => b.pulledAt - a.pulledAt)
  let last6StarIdx = sortedPulls.findIndex(x=>x.rarity === 6 && !['chr_0025_ardelia', 'chr_0026_lastrite', 'chr_0029_pograni', 'chr_0009_azrila', 'chr_0015_lifeng'].includes(x.id))
  if(last6StarIdx === -1) last6StarIdx = sortedPulls.length;

  last6StarIdx -= sortedPulls.slice(0, last6StarIdx).filter(x=>("isFree" in x) && x.isFree).length
  return last6StarIdx
}

function calculate5050WinOdds(data: Partial<Record<string, AKECharacterHistory[]>>) {
  const excludedCharacters = new Set(['chr_0025_ardelia', 'chr_0026_lastrite', 'chr_0029_pograni', 'chr_0009_azrila', 'chr_0015_lifeng']);
  const excludedPools = new Set(['standard', 'beginner']);

  const sixStarChars = Object.entries(data)
      .filter(([poolId]) => !excludedPools.has(poolId.toLowerCase()))
      .flatMap(([, characters]) => characters?.filter(char => char.rarity === 6) ?? []);

  return sixStarChars.reduce((p, n) => {
    if (excludedCharacters.has(n.id)) return p
    const nextChar = sixStarChars.find((_, i)=>i > sixStarChars.indexOf(n))
    if(!nextChar) return p
    return !excludedCharacters.has(nextChar.id) ? ++p : p
  }, 0) / sixStarChars.length * 100
}

console.log("Alpinejs start")
Alpine.start()

const updateSW = registerSW({
  onRegisteredSW(_, reg) {
    console.log("SW registered")
    reg && setInterval(() => {
      reg.update()
      console.log("SW update")
    }, 30000)
  },
  onOfflineReady() {
    //@ts-ignore
    ot.toast("App is ready for offline use", "Offline Ready", { variant: 'success' })
  },
  async onNeedRefresh() {
    const decision = await new Promise<string>(res => {
      const dialog = document.getElementById("refresh-dialog") as HTMLDialogElement
      dialog.addEventListener("close", () => {
        res(dialog.returnValue)
      }, {once: true})
      dialog.showModal()
    })

    if (decision === "ok") await updateSW(true)
  }
})

