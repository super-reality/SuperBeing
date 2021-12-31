import RecordRTC from "recordrtc";

export function generateSineWaveSignal(frequency, amplitude, duration, channels, sampleRate) {
    const length = duration * sampleRate
    const buffer = new (AudioBuffer)({length, numberOfChannels: channels, sampleRate})
    const omega = 2 * Math.PI * frequency
    for(let channel = 0; channel < channels; channel++) {
        const channelData = buffer.getChannelData(channel)
        for(let p = 0; p < length; p++) {
            channelData[p] = Math.sin(p / sampleRate * omega) * amplitude
        }
    }
    return buffer
}

export function generateWavFile(buffer, fileType, filePath) {
    const wavFileData = WavFileEncoder.encodeWavFile(buffer, fileType)
    const writer = fs.createWriteStream(filePath)
    writer.write(wavFileData)
    writer.close()
}

export function readWavFile(filePath) {
    const fd = fs.openSync(filePath, 'r')
    const buffer = []
    const _buffer = Buffer.alloc(1)
    while(true) {
        const num = fs.readSync(fd, _buffer, 0, 1, null)
        if (num === 0) break
        buffer.push(_buffer[0])
    }
    return buffer
}

export function d(stream) {
    const rec = new MediaRecorder(stream)
    rec.addEventListener('dataavailable', e => {
        const data = e.data
    })

    const recordAudio = new RecordRTC(stream)
    recordAudio.startRecording()
    recordAudio.stopRecording()
    const buffer = recordAudio.buffer
    
}