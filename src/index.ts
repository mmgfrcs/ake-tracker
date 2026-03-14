import '@knadh/oat/oat.min.css';
import './index.css'
import * as idb from 'idb'
import Alpine from 'alpinejs'
import icon from './assets/icon.png'
import type { AKEGachaCharacter, AKEGachaRecord, AKEGachaWeapon } from './models/record';
import type {AKECharacterHistory, AKEDBSchema, AKEWeaponHistory} from "./models/history.ts";
import '@knadh/oat/oat.min.js'
import { createIcons, Download } from 'lucide';

createIcons({icons: {
  Download
}})

const link = document.querySelector("link[rel~='icon']");
if (link) (link as HTMLLinkElement).href = icon;
const applink = document.querySelector("link[rel~='apple-touch-icon']");
if (applink) (applink as HTMLLinkElement).href = icon;

const iconImg = document.querySelector(".icon");
if (iconImg) (iconImg as HTMLImageElement).src = icon;


let db: idb.IDBPDatabase<AKEDBSchema>;

//@ts-ignore
window.Alpine = Alpine

Alpine.data("pulldata", () => ({
  async initDb() {
    try {
      // Let us open our database
      db = await idb.openDB("akeTracker", 2, {
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
      const assetMod = import.meta.glob("/src/assets/chars/*.png", {import: "default"})

      for(let assetPth in assetMod) {
        const name = assetPth.match(/[^/\\]+?(?=\.\w+$)/);
        if (!name) continue;
        
        await db.put("assets", {id: name[0], value: await assetMod[assetPth]() as string})
      }

      const assetWeapMod = import.meta.glob("/src/assets/weapons/*.png", {import: "default"})

      for(let assetPth in assetWeapMod) {
        const name = assetPth.match(/[^/\\]+?(?=\.\w+$)/);
        if (!name) continue;
        
        await db.put("assets", {id: name[0], value: await assetWeapMod[assetPth]() as string})
      }
      
      const data = await loadData()
      this.pulls.weapons = data.weapons
      this.pulls.chars = data.characters
      this.pulls.weaponPools = data.weaponPools
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
    this.pulls.charStats.currencySpent = this.pulls.charStats.pullNo * 500
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
    weaponPools: <{id: string, name: string}[]>[],
    charPools: <{id: string, name: string}[]>[],
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

      const blob = new Blob([JSON.stringify({characters: charArr, weapons: weapArr})], {type: 'application/json'});
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

async function loadData() {
  if(!db) throw new Error("DB uninitialized before load");

  const weapons = await db.getAll("weapons") as AKEWeaponHistory[]
  const characters = await db.getAll("characters") as AKECharacterHistory[]
  
  return {
    weapons: sortKeys(Object.groupBy<string, AKEWeaponHistory>(weapons.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    characters: sortKeys(Object.groupBy<string, AKECharacterHistory>(characters.sort((a, b)=>b.pulledAt - a.pulledAt || b.seqId - a.seqId), x=>x.poolId)),
    weaponPools: removeDupes(weapons.map(x=>({id: x.poolId, name: x.poolName}))),
    characterPools: removeDupes(characters.map(x=>({id: x.poolId, name: x.poolName}))),
  }

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
  return Object.keys(obj)
    .sort((a, b)=>obj[a].length > 0 && obj[b].length > 0 && obj[a][0]["pulledAt"] && obj[b][0]["pulledAt"] ? obj[b][0]["pulledAt"] - obj[a][0]["pulledAt"] : a > b ? -1 : 1) // Sorts keys ('fruit', 'vegetable') alphabetically
    .reduce((acc, key) => {
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

if(!(await navigator.storage.persisted()) && [null, "denied"].includes(localStorage.getItem("persist"))) {
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
    localStorage.setItem("persist", tryPersist ? "enabled" : "denied")
    if (!tryPersist) {
      const dialog = document.getElementById("persistence-denied-dialog") as HTMLDialogElement
      dialog.showModal()
    }
  } else localStorage.setItem("persist", decision)
}

