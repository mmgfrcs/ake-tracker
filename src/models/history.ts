import type { DBSchema } from "idb"

export interface AKECharacterHistory {
    id: string
    name: string
    poolId: string
    poolName: string
    pulledAt: number
    rarity: number
    seqId: number
    isFree: boolean
}

export type AKEWeaponHistory = Omit<AKECharacterHistory, "isFree"> & {type: string}

export interface AKEDBSchema extends DBSchema {
    "assets": {
        key: string,
        value: {
            id: string,
            value: string
        },
    },
    "characters": {
        key: number,
        value: AKECharacterHistory,
        indexes: { 'pulledAt': number, name: string };
    },
    "weapons": {
        key: number,
        value: AKEWeaponHistory,
        indexes: { 'pulledAt': number, name: string };
    },
}