export interface AKEGachaRecord {
  characters: AKEGachaCharacter[]
  weapons: AKEGachaWeapon[]
}

interface AKEGachaItem {
    poolId: string
    poolName: string
    rarity: number
    isNew: boolean
    gachaTs: string
    seqId: string
}

export interface AKEGachaCharacter extends AKEGachaItem {
    charId: string
    charName: string
    isFree: boolean
}

export interface AKEGachaWeapon extends AKEGachaItem {
    weaponId: string
    weaponName: string
    weaponType: string
}