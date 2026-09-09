import type { Alpine } from 'alpinejs'
import { type AKECharacterHistory, type AKEListCount, type AKEWeaponHistory } from './models/history'
import db from './lib/db'
import type { AKEGachaRecord } from './models/record'
import poolInfo from './pools.json';
import satori from 'satori'
import icon from "./assets/icon.png"
import {
  replicateWebRTC,
  getConnectionHandlerSimplePeer,
  type SimplePeer,
  type RxWebRTCReplicationState
} from 'rxdb/plugins/replication-webrtc';
import '@knadh/oat/oat.min.js'
import type { SyncRemotePeers } from './models/sync';
import {BehaviorSubject, combineLatest} from 'rxjs'
import { map } from 'rxjs/operators';

export default (Alpine: Alpine) => {
  
  console.log("Alpine load")

  Alpine.data("meta", () => ({
    appVer: import.meta.env.VITE_APP_VERSION,
    gameVer: "1.5",
  }))

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
                    src: file && file.size !== 0 && file.name !== "" ? await (file as File).arrayBuffer() : icon.src,
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
        console.log("Pulldata init")
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
      this.pulls.weaponStats.currencySpent = this.pulls.weaponStats.pullNo * 198
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

          await db.weapons.upsert(tobj)
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
          await db.characters.upsert(tobj)
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
      const name = char.name.replaceAll(/[^a-z0-9]/gi, "").replaceAll(" ", "").toLowerCase()
      const icon = await db.assets.findOne(name).exec()
      return icon?.value
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
  Alpine.data("sync", () => ({
    peer: <Awaited<ReturnType<typeof replicateWebRTC<unknown, SimplePeer>>>[]>[],
    enableSync: false,
    remotePeers: <SyncRemotePeers[]>[],
    roomId: "",
    ids: {
      character: "",
      weapon: ""
    },
    init() {
      if (this.enableSync) this.startSync()
    },
    async start() {
      if(this.roomId === "") this.roomId = "aketracker-" + crypto.randomUUID()
      localStorage.setItem("syncId", this.roomId)
      this.enableSync = true
      await this.startSync()
    },
    async startSync() {
      this.roomId = localStorage.getItem("syncId")!
      
      const setCharId = (id: string) => {
        this.ids.character = id
      }

      const setWeapId = (id: string) => {
        this.ids.weapon = id
      }

      function getConstructor(isChar: boolean) {
        return class CustomWebSocket extends WebSocket {
          isWSChar = isChar

          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);
            this.addEventListener('message', (event) => {
              try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'init' && msg.yourPeerId) {
                  if(isChar) setCharId(msg.yourPeerId)
                  else setWeapId(msg.yourPeerId)
                }
              } catch (e) {
                console.error("[CustomWebSocket] Unexpected message", event.data)
              }
            });
          }
        }
      }
      

      const charP2pPool = await replicateWebRTC({
        collection: db.characters,
        topic: this.roomId+"-char",
        connectionHandlerCreator: getConnectionHandlerSimplePeer({webSocketConstructor: getConstructor(true)}),
        isPeerValid: peer => {
          const rPeer = this.remotePeers.find(x=>x.charSyncId === peer.id)
          if (!rPeer) this.remotePeers.push({charSyncId: peer.id, weaponSyncId: "", charSyncState: "UNCONNECTED", weaponSyncState: "UNCONNECTED"})
          else rPeer.charSyncId = peer.id
          ot.toast(`Peer ${peer.id} Connected to Character Sync`, "WebRTC Sync", {variant: "success"})
          return true
        },
        pull: {},
        push: {},
      })

      const weapP2pPool = await replicateWebRTC({
        collection: db.weapons,
        topic: this.roomId+"-weap",
        connectionHandlerCreator: getConnectionHandlerSimplePeer({webSocketConstructor: getConstructor(false)}),
        isPeerValid: peer => {
          const rPeer = this.remotePeers.find(x=>x.weaponSyncId === peer.id)
          if (!rPeer) this.remotePeers.push({weaponSyncId: peer.id, charSyncId: "", charSyncState: "UNCONNECTED", weaponSyncState: "UNCONNECTED"})
          else rPeer.weaponSyncId = peer.id
          ot.toast(`Peer ${peer.id} Connected to Weapon Sync`, "WebRTC Sync", {variant: "success"})
          return true
        },
        pull: {},
        push: {},
      })

      charP2pPool.peerStates$.subscribe(x=>x.forEach(y=> {
        console.log("Get state", y.peer.id, y.replicationState)
        const peer = this.remotePeers.find(z=>z.charSyncId === y.peer.id)
        if(!peer) {
          this.remotePeers.push({charSyncId: y.peer.id, weaponSyncId: "", charSyncState: "UNCONNECTED", weaponSyncState: "UNCONNECTED"})
          return
        }
        if (y.replicationState) {
          y.replicationState.active$.subscribe(x=>peer.charSyncState = x ? "SYNC" : "IDLE")
          y.replicationState.canceled$.subscribe(x=>peer.charSyncState = "UNCONNECTED")
          y.replicationState.error$.subscribe(x=>{console.error(x); peer.charSyncState = "ERROR"})
          getPeerStateString$(y.replicationState).subscribe(aa => {
            console.log("State", aa)
            peer.weaponSyncState = aa
          })
        }
      }))

      weapP2pPool.peerStates$.subscribe(x=>x.forEach(y=> {
        const peer = this.remotePeers.find(z=>z.weaponSyncId === y.peer.id)
        if(!peer) {
          this.remotePeers.push({weaponSyncId: y.peer.id, charSyncId: "", charSyncState: "UNCONNECTED", weaponSyncState: "UNCONNECTED"})
          return
        }
        if (y.replicationState) {
          y.replicationState.active$.subscribe(x=>peer.weaponSyncState = x ? "SYNC" : "IDLE")
          y.replicationState.canceled$.subscribe(x=>peer.weaponSyncState = "UNCONNECTED")
          y.replicationState.error$.subscribe(x=>{console.error(x); peer.weaponSyncState = "ERROR"})
        
          getPeerStateString$(y.replicationState).subscribe(aa => {
            console.log("State", aa)
            peer.weaponSyncState = aa
          })
        }

      }))

      charP2pPool.error$.subscribe(v => ot.toast(v.name, "WebRTC Error", {variant: "danger"}))
      weapP2pPool.error$.subscribe(v => ot.toast(v.name, "WebRTC Error", {variant: "danger"}))

      this.peer.push(charP2pPool, weapP2pPool)
    },
    async disableSync() {
      await Promise.all(this.peer.map(async x=>await x.cancel()))
      this.peer = []
      localStorage.removeItem("syncId")
      this.roomId = ""
      this.enableSync = false
    }
  }))

  console.log("Alpine load done")
}

async function loadData() {
  if(!db) throw new Error("DB uninitialized before load");

  const weapons = await db.weapons.find().exec() as AKEWeaponHistory[]
  const characters = await db.characters.find().exec() as AKECharacterHistory[]

  return {
    weapons: sortKeys(Map.groupBy<string, AKEWeaponHistory>(weapons.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    characters: sortKeys(Map.groupBy<string, AKECharacterHistory>(characters.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    weaponPools: removeDupes((await Promise.all(weapons.map(async x=>{
      const inf = poolInfo.map(x=>({...x})).find(y=>y.name === x.poolName)
      if(inf) inf.image = (await db.assets.findOne(inf.image).exec())?.value ?? ""
      return {
        id: x.poolId,
        name: x.poolName,
        info: inf
      }
    })))).map(x=>({...x, pity: calculateCurrentPity(weapons, x.id)})),

    characterPools: removeDupes((await Promise.all(characters.map(async x=>{
      const inf = poolInfo.map(x=>({...x})).find(y=>y.name === x.poolName)
      if(inf) inf.image = (await db.assets.findOne(inf.image).exec())?.value ?? ""
      return {
        id: x.poolId,
        name: x.poolName,
        info: inf
      }
    })))).map(x=>{
      return x
    }).map(x=>({...x, pity: calculateCurrentPity(characters, x.id), guarantee: calculateCurrentPityGuarantee(characters, x.id)})),
  }
}

// async function getDataForBackupAndSync() {
//   const charArr = (await db.getAll("characters")).map(x=>(<AKEGachaCharacter>{
//     charId: x.id,
//     charName: x.name,
//     gachaTs: x.pulledAt.toString(),
//     isFree: x.isFree,
//     isNew: false,
//     poolId: x.poolId,
//     poolName: x.poolName,
//     rarity: x.rarity,
//     seqId: x.seqId.toString()
//   }))
//   const weapArr = (await db.getAll("weapons")).map(x=>(<AKEGachaWeapon>{
//     weaponId: x.id,
//     weaponName: x.name,
//     weaponType: x.type,
//     gachaTs: x.pulledAt.toString(),
//     isNew: false,
//     poolId: x.poolId,
//     poolName: x.poolName,
//     rarity: x.rarity,
//     seqId: x.seqId.toString()
//   }))

//   return {characters: charArr, weapons: weapArr}
// }

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
      return poolId.includes('special') 
        ? x.poolId.includes('special') 
        : poolId.includes('joint')
        ? x.poolId.includes('joint')
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
            src: x && (await db.assets.findOne(x.name.replaceAll(/[^a-z0-9]/gi, "").replaceAll(" ", "").toLowerCase()).exec())?.value,
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

function getPeerStateString$(replicationState: RxWebRTCReplicationState<unknown>) {
  return combineLatest([
    replicationState.active$,
    replicationState.canceled$,
    replicationState.error$
  ]).pipe(
    map(([active, canceled, error]) => {
      if (canceled) return 'UNCONNECTED';
      if (error)    return 'ERROR';
      if (active)   return 'SYNC';
      return 'IDLE';
    })
  );
}