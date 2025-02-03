/* eslint-disable @typescript-eslint/no-unsafe-member-access */


export const smrIsEmbeddedMode = (): boolean => (window as any)._smr_is_embedded ? true : false;

export const smrMode = () => true;
