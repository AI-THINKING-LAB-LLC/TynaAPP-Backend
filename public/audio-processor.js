// AudioWorklet processor for real-time audio streaming
class AudioStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferSize = 8192; // Accumulate ~512ms at 16kHz (8192 samples = 512ms)
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const channelData = input[0]; // Get first channel
      
      // Accumulate samples
      for (let i = 0; i < channelData.length; i++) {
        this.buffer.push(channelData[i]);
      }
      
      // Send when buffer is full enough (meets AssemblyAI's 50-1000ms requirement)
      if (this.buffer.length >= this.bufferSize) {
        // Convert Float32Array to Int16Array (PCM S16LE)
        const int16 = new Int16Array(this.buffer.length);
        for (let i = 0; i < this.buffer.length; i++) {
          const s = Math.max(-1, Math.min(1, this.buffer[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Send audio data to main thread
        this.port.postMessage(int16.buffer, [int16.buffer]);
        
        // Clear buffer
        this.buffer = [];
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);
