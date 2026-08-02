import type { DBSchema } from "idb"

/**
 * Arknights Endfield Character History
 */
export interface AKECharacterHistory {
    /** Character ID */
    id: string 
    name: string // Character Name
    poolId: string // Banner Pool ID
    poolName: string // Banner Pool Name
    pulledAt: number // Pull Timestamp
    rarity: number // Character Rarity
    seqId: number // Sequence ID
    isFree: boolean // Was the character obtained for free?
}

/**
 * Arknights Endfield Weapon History. Same as Character history but without isFree and with a type
 */
export type AKEWeaponHistory = Omit<AKECharacterHistory, "isFree"> & {type: string}

export interface AKEListCount {
    name: string
    count: number
    rarity: number
}

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