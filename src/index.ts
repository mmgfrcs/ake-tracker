import '@knadh/oat/oat.min.css';
import './index.css'
import * as idb from 'idb'
import Alpine from 'alpinejs'
import icon from './assets/icon.png'
import type {AKEGachaCharacter, AKEGachaRecord, AKEGachaWeapon} from './models/record';
import type {AKECharacterHistory, AKEDBSchema, AKEWeaponHistory} from "./models/history.ts";
import '@knadh/oat/oat.min.js'
import {createIcons, Download, Trash2} from 'lucide';
import {registerSW} from 'virtual:pwa-register'
import {type DataConnection, Peer} from 'peerjs'
import {applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector} from 'yjs'
import type {SyncMessage} from "./models/sync.ts";
import poolInfo from './pools.json';

createIcons({icons: {
  Download,
  Trash2
}})

const link = document.querySelector("link[rel~='icon']");
if (link) (link as HTMLLinkElement).href = icon;
const applink = document.querySelector("link[rel~='apple-touch-icon']");
if (applink) (applink as HTMLLinkElement).href = icon;

const iconImg = document.querySelector(".icon");
if (iconImg) (iconImg as HTMLImageElement).src = icon;


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

//@ts-ignore
window.Alpine = Alpine

Alpine.data("meta", () => ({
  appVer: import.meta.env.VITE_APP_VERSION,
  gameVer: "1.2",
}))

Alpine.data("persistence", () => ({
  isPersistent: false,
  async showPersistence() {
    const decision = await new Promise<string>(res => {
      const dialog = document.getElementById("persistence-dialog") as HTMLDialogElement
      dialog.addEventListener("close", function onClose() {
        dialog.removeEventListener('close', onClose)
        console.log(dialog.returnValue)
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
      console.log(data.characterPools)
      this.pulls.charPools = data.characterPools
      this.calculateStats()
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
  async loadUrl(e: SubmitEvent & {currentTarget: HTMLFormElement}) {
    this.urlForm.enableSubmit = false

    const fData = new FormData(e.currentTarget, e.submitter)
    const file = fData.get('file') as File

    try {
      if (file.type !== "application/json") throw new Error("Invalid type " + file.type)

      const fileCt = JSON.parse(await file.text()) as AKEGachaRecord

      this.pulls.weapons = Object.groupBy(await Promise.all(fileCt.weapons.map(async (x)=>{
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
      })), x=>x.poolId)

      this.pulls.chars = Object.groupBy(await Promise.all(fileCt.characters.map(async (x)=>{
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
      })), x=>x.poolId)

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
    return (await db.get("assets", char.name.replaceAll(" ", "").toLowerCase()))?.value
  },
  // Actual data
  pulls: {
    // TODO: Typing
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
          console.log(characters.length, weapons.length)

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
    weapons: sortKeys(Object.groupBy<string, AKEWeaponHistory>(weapons.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    characters: sortKeys(Object.groupBy<string, AKECharacterHistory>(characters.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
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

function sortKeys(obj: Partial<Record<string, any>>) {
  console.log(obj)
  let keys = Object.keys(obj)
    .filter(key => key != "standard" && key != "beginner")
    .sort((a, b)=> {
      console.log(a, b)
      if (obj[a].length === 0 || obj[b].length === 0) return 0
      if (a === "standard" || a === "beginner" || b === "standard" || b === "beginner") return 1
      return obj[a][0]["pulledAt"] && obj[b][0]["pulledAt"] ? obj[b][0]["pulledAt"] - obj[a][0]["pulledAt"] : a > b ? -1 : 1
    })

  keys.push(...Object.keys(obj).filter(key => key === "standard" || key === "beginner"))

  return keys.reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, <{[x: string]: any}>{});
}

function calculateAvgPity(data: Partial<Record<any, any[]>>) {
  const poolAverages = Object.values(data)
      .map(poolChars => {
        if (!poolChars) return 0;
        const rarity6Positions = poolChars
            .toReversed()
            .map((char, index) => char.rarity === 6 ? index+1 : -1)
            .filter(pos => pos !== -1);

        if (rarity6Positions.length === 0) return 0;
        if (rarity6Positions.length === 1) return rarity6Positions[0];

        const pullsBetween = rarity6Positions
            .map((pos, i) => i === 0 ? pos : pos - rarity6Positions[i - 1]);

        return pullsBetween.reduce((sum, pulls) => sum + pulls, 0) / pullsBetween.length;
      })
      .filter(avg => avg > 0);

  return poolAverages.length === 0 ? 0 :
      poolAverages.reduce((sum, avg) => sum + avg, 0) / poolAverages.length;
}

function calculateCurrentPity(data: (AKECharacterHistory|AKEWeaponHistory)[], _: string) {
  if(!data || data.length === 0) return 0;

  const sortedPulls = data.filter(x=>x.poolId !== "standard" && x.poolId !== "beginner").sort((a, b) => b.pulledAt - a.pulledAt)
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

  return sixStarChars.length === 0 ? 0 :
      (sixStarChars.filter(char => !excludedCharacters.has(char.id)).length / sixStarChars.length) * 100;
}

console.log("Alpinejs start")
Alpine.start()

const updateSW = registerSW({
  onOfflineReady() {
    //@ts-ignore
    ot.toast("App is ready for offline use", "Offline Ready", { variant: 'success' })
  },
  async onNeedRefresh() {
    const decision = await new Promise<string>(res => {
      const dialog = document.getElementById("refresh-dialog") as HTMLDialogElement
      dialog.addEventListener("close", function onClose() {
        dialog.removeEventListener('close', onClose)
        res(dialog.returnValue)
      })
      dialog.showModal()
    })

    if (decision === "ok") await updateSW()
  },
})

