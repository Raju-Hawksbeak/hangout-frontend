export async function extractWaveformPeaks(audioBlob, samples = 32) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioCtx();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(rawData.length / samples));
    const peaks = [];

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize && blockStart + j < rawData.length; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      const avg = sum / blockSize;
      peaks.push(Math.min(100, Math.max(12, Math.round(avg * 450))));
    }

    const duration = Math.max(1, Math.round(audioBuffer.duration));
    await audioContext.close();
    return { peaks, duration };
  } catch (err) {
    // Fallback waveform if browser codec decoding is restricted
    const fallbackPeaks = Array.from({ length: samples }, () =>
      Math.floor(20 + Math.random() * 65)
    );
    return { peaks: fallbackPeaks, duration: 5 };
  }
}
