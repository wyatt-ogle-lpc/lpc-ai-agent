//public/audio/audio-processor.js

class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      const channelData = input[0];
      const copy = new Float32Array(channelData.length);
      copy.set(channelData);
      this.port.postMessage(copy);
    }
    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);
