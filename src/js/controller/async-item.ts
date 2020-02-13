import { normalizePlaylistItem } from 'playlist/playlist';
// Type only imports
import Item from 'playlist/item';
import Model from 'controller/model';
import ApiPublic from 'api/api';

type AsyncCallback = (item: Item, index: number) => Promise<Item | void> | void;

export class AsyncItemController {
    private index: number;
    private model: Model;
    private api: ApiPublic;
    private promise: Promise<Item>;
    private resolve!: (item: Item) => void;
    private reject!: (error: Error) => void;
    private async: AsyncCallback | null;
    private asyncPromise: Promise<Item | void> | null;

    constructor (index: number, model: Model, api: ApiPublic) {
        this.index = index;
        this.model = model;
        this.api = api;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        this.async = null;
        this.asyncPromise = null;
    }

    set callback (handler: AsyncCallback) {
        this.async = handler;
    }

    run (): Promise<Item> {
        const { api, async, index, model, resolve, reject, promise } = this;
        const playlist = model.get('playlist');
        const playlistItem = this.getItem(index);
        if (!playlistItem) {
            const message = index === -1 ? 'No recs item' : `No playlist item at index ${index}`;
            reject(new Error(message));
        }
        if (async) {
            this.clear();
            const asyncPromise = this.asyncPromise = async.call(api, playlistItem, index);
            if (asyncPromise && asyncPromise.then) {
                asyncPromise.then((item: Item | void) => {
                    if (item && item !== playlistItem) {
                        const newItem = normalizePlaylistItem(model, new Item(item), item.feedData || {});
                        if (index === -1) {
                            model.set('nextUp', newItem);
                        } else {
                            playlist[index] = newItem;
                        }
                        resolve(newItem);
                    } else {
                        resolve(playlistItem);
                    }
                }).catch(reject);
            } else {
                this.asyncPromise = null;
            }
        }
        if (!this.asyncPromise) {
            resolve(playlistItem);
        }
        return promise;
    }

    getItem(index: number): Item {
        const { model } = this;
        if (index === -1) {
            return model.get('nextUp');
        }
        const playlist = model.get('playlist');
        return playlist[index];
    }

    clear (): void {
        this.async = null;
    }
}