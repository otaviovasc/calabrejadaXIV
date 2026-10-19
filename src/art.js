// Keep URLs local so Vite bundles the artwork and result export stays canvas-safe.
const sources = {
  chicken: new URL('../assets/optimized/chicken-nostra-back.png', import.meta.url).href,
  pickup29: new URL('../assets/optimized/pickup-29.png', import.meta.url).href,
  pickup55: new URL('../assets/optimized/pickup-55.png', import.meta.url).href,
  ticket: new URL('../assets/optimized/pickup-ticket.png', import.meta.url).href,
  truckRight: new URL('../assets/optimized/truck-29-right.png', import.meta.url).href,
  truckLeft: new URL('../assets/optimized/truck-29-left.png', import.meta.url).href,
  newageRight: new URL('../assets/optimized/van-newage-right.png', import.meta.url).href,
  newageLeft: new URL('../assets/optimized/van-newage-left.png', import.meta.url).href,
  partyRight: new URL('../assets/optimized/van-calabrejada-right.png', import.meta.url).href,
  partyLeft: new URL('../assets/optimized/van-calabrejada-left.png', import.meta.url).href,
};

export const art = {};
export const artReady = typeof Image === 'undefined' ? Promise.resolve() : Promise.all(
  Object.entries(sources).map(([key, url]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Trim transparent margins once; originals remain untouched. Alpha > 230
      // ignores tiny stray pixels when choosing the visual object's bounds.
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      let left = image.width, top = image.height, right = 0, bottom = 0;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          if (pixels[(y * image.width + x) * 4 + 3] > 230) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
      }
      const width = Math.max(1, right - left + 1), height = Math.max(1, bottom - top + 1);
      const scale = Math.min(1, 420 / Math.max(width, height));
      const sprite = document.createElement('canvas');
      sprite.width = Math.ceil(width * scale);
      sprite.height = Math.ceil(height * scale);
      sprite.getContext('2d').drawImage(image, left, top, width, height, 0, 0, sprite.width, sprite.height);
      sprite.sourceBounds={left,top,width,height,sourceWidth:image.width,sourceHeight:image.height};
      art[key] = sprite;
      resolve();
    };
    image.onerror = () => reject(new Error(`Não foi possível carregar a arte ${key}. Recarregue o jogo.`));
    image.src = url;
  })),
);

export const PICKUPS = [
  {key: 'pickup29', name: '29 SABORES'},
  {key: 'pickup55', name: 'WIENBIER 55'},
  {key: 'ticket', name: 'CALABREJADA XVI'},
];
export const VEHICLES = ['truck', 'newage', 'party'];

export function vehicleArtKey(car) {
  return `${car.sponsor || 'party'}${car.speed > 0 ? 'Right' : 'Left'}`;
}
