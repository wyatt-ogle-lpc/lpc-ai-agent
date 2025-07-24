//app/javascript/wav_encoder.js
export function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
  
    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }
  
    function floatTo16BitPCM(output, offset, input) {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    }
  
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, 1, true);  // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true);  // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
  
    floatTo16BitPCM(view, 44, samples);
    return new Blob([view], { type: "audio/wav" });
  }
  