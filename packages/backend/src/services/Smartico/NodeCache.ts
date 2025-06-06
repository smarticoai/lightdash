/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-prototype-builtins */
class NodeCache {

	private ttlChecker: any;

	private cache: { [key: string]: any } = {};

	constructor() {		
		if (this.ttlChecker === undefined) {
			this.ttlChecker = setInterval(() => {
				const now = new Date().getTime();
				for (const key in this.cache) {
					if (this.cache.hasOwnProperty(key)) {
						const o = this.cache[key];
						if (o.ttl < now) {
							delete this.cache[key];
						}
					}
				}
			}, 1000);
		}
	}

	public get(key: string): any {
		const o = this.cache[key];
		if (o !== undefined && o.ttl > new Date().getTime()) {
			return o.value;
		}
		return undefined;
	}

	public set(key: string, value: any, ttlSeconds: number = 60) {
		this.cache[key] = {
			value,
			ttl: new Date().getTime() + ttlSeconds * 1000,
		};
	}

	public remove(key: string) {
		if (this.cache.hasOwnProperty(key)) {
			delete this.cache[key];
		}
	}

	public flushAll() {
		this.cache = {};
		if (this.ttlChecker) {
			clearInterval(this.ttlChecker);
			this.ttlChecker = undefined
		}
	}
}

export { NodeCache };
