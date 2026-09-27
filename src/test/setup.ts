/**
 * Global testinställning. jsdom saknar ljuduppspelning (HTMLMediaElement.play/pause skriver
 * "Not implemented"), så i jsdom-tester ersätts de med tysta stubbar. Tester som vill
 * kontrollera uppspelningen spionerar på dem (se src/mika/mikaAudio.test.tsx).
 */
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = function play() {
    return Promise.resolve()
  }
  HTMLMediaElement.prototype.pause = function pause() {}
}
