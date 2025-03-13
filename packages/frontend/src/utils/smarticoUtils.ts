/* eslint-disable @typescript-eslint/no-unsafe-member-access */


export const smrIsEmbeddedMode = (): boolean => (window as any)._smr_is_embedded ? true : false;

export const smrCurrency = (): string => (window as any)._smr_currency;

export const smrMode = () => true;

export const smrReplaceRecursivelyCurrency = (obj: any): any => {
    const c = smrCurrency();
    if (!c) {
        return obj;
    }

    if (typeof obj === 'string') {
        return obj.replace(/\{cur\}/g, c);
    }
    if (Array.isArray(obj)) {
        return obj.map(smrReplaceRecursivelyCurrency);
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = smrReplaceRecursivelyCurrency(obj[key]);
        }
        return newObj;
    }
    return obj;
};
