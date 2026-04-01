export interface SyncMessage {
    type: string,
    origin: string,
    data?: Uint8Array<ArrayBufferLike>
}