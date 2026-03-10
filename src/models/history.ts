export interface AKECharacterHistory {
    icon: string
    id: string
    name: string
    poolId: string
    poolName: string
    pulledAt: number
    rarity: number
    seqId: number
}

export type AKEWeaponHistory = Omit<AKECharacterHistory, "icon"> & {type: string}
