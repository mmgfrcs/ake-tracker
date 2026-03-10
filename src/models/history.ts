export interface AKECharacterHistory {
    id: string
    name: string
    poolId: string
    poolName: string
    pulledAt: number
    rarity: number
    seqId: number
}

export type AKEWeaponHistory = AKECharacterHistory & {type: string}
