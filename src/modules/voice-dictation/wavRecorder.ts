type WavRecording = {
  blob: Blob;
  sampleRate: number;
  durationMs: number;
};

type RecorderState = {
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  stream: MediaStream;
  startedAt: number;
  chunks: Float32Array[];
};

let state: RecorderState | null = null;

function mergeFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((a, b) => a + b.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged;
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  const targetRate = 16000;
  if (inputSampleRate === targetRate) return input;
  const ratio = inputSampleRate / targetRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  let inOffset = 0;
  for (let i = 0; i < outLength; i++) {
    const nextOffset = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = inOffset; j < nextOffset && j < input.length; j++) {
      sum += input[j] ?? 0;
      count++;
    }
    out[i] = count ? sum / count : 0;
    inOffset = nextOffset;
  }
  return out;
}

function encodeWavPcm16Mono(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export async function startWavRecording(): Promise<void> {
  if (state) return;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  state = { audioContext, source, processor, stream, startedAt: Date.now(), chunks };
}

export async function stopWavRecording(): Promise<WavRecording | null> {
  if (!state) return null;

  const { audioContext, processor, source, stream, startedAt, chunks } = state;
  state = null;

  processor.disconnect();
  source.disconnect();
  stream.getTracks().forEach((t) => t.stop());
  await audioContext.close();

  const merged = mergeFloat32(chunks);
  const pcm16k = downsampleTo16k(merged, audioContext.sampleRate);
  const wav = encodeWavPcm16Mono(pcm16k, 16000);
  const blob = new Blob([wav], { type: "audio/wav" });

  return {
    blob,
    sampleRate: 16000,
    durationMs: Date.now() - startedAt
  };
}

