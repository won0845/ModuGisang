class DecibelProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.lastProcessedTime = 0; // 마지막으로 처리된 시간을 저장할 변수
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const currentTimeMs = Date.now(); // 현재 시간을 밀리초로 변환

    if (input.length > 0) {
      const inputChannel = input[0];
      let sum = 0;
      for (let i = 0; i < inputChannel.length; i++) {
        sum += inputChannel[i] * inputChannel[i];
      }
      const rms = Math.sqrt(sum / inputChannel.length);
      const decibels = 20 * Math.log10(rms / 0.00002); // 20 μPa를 기준으로 데시벨 계산

      // 0.2초마다 처리
      if (currentTimeMs - this.lastProcessedTime >= 200) {
        this.lastProcessedTime = currentTimeMs;
        this.port.postMessage({ decibels });
      }
    }
    return true;
  }
}

registerProcessor('decibel-processor', DecibelProcessor);
