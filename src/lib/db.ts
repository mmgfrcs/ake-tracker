import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { addRxPlugin } from 'rxdb/plugins/core';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { createRxDatabase } from 'rxdb/plugins/core';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election'
import {Dexie} from "dexie"

let storage = wrappedValidateAjvStorage({ storage: getRxStorageDexie() });
if (import.meta.env.DEV) addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBCleanupPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);

const db = await createRxDatabase({
  name: 'akeTracker',
  storage: storage
});

await db.addCollections({
  // name of the collection
  assets: {
    localDocuments: true,
    // we use the JSON-schema standard
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have maxLength
        },
        value: {
          type: 'string',
        }
      },
      required: ['id', 'value']
    }
  },
  characters: {
    schema: {
      version: 0,
      primaryKey: {
        key: "collId",
        fields: ["seqId"],
        separator: ""
      },
      indexes: ["name", "pulledAt"],
      type: 'object',
      properties: {
        id: {
          type: 'string',
          maxLength: 20 // <- the primary key must have maxLength
        },
        isFree: { type: "boolean"},
        name: { type: 'string', maxLength: 64 },
        poolId: { type: 'string' },
        poolName: { type: 'string' },
        pulledAt: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 9999999999999 },
        rarity: { type: 'integer' },
        seqId: { type: 'integer' },
        collId: { type: "string", maxLength: 10 }
      },
      required: ['id', 'isFree', "name", "poolId", "poolName", "pulledAt", "rarity", "seqId"]
    }
  },
  weapons: {
    schema: {
      version: 0,
      primaryKey: {
        key: "collId",
        fields: ["seqId"],
        separator: ""
      },
      indexes: ["name", "pulledAt"],
      type: 'object',
      properties: {
        id: {
          type: 'string',
          maxLength: 20 // <- the primary key must have maxLength
        },
        type: { type: "string"},
        name: { type: 'string', maxLength: 64 },
        poolId: { type: 'string' },
        poolName: { type: 'string' },
        pulledAt: { type: 'integer', multipleOf: 1, minimum: 0, maximum: 9999999999999 },
        rarity: { type: 'integer' },
        seqId: { type: 'integer' },
        collId: { type: "string", maxLength: 10 }
      },
      required: ['id', 'type', "name", "poolId", "poolName", "pulledAt", "rarity", "seqId"]
    }
  }
});

const oldDb = new Dexie("akeTracker")
oldDb.version(1).stores({
  characters: "seqId", // Primary key and indexed props
  weapons: "seqId"
})

const oldCharData = await oldDb.table("characters").toArray()
await db.characters.bulkUpsert(oldCharData)

const oldWeapData = await oldDb.table("weapons").toArray()
await db.weapons.bulkUpsert(oldWeapData)

export default db;