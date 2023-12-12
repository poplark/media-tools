const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

// 将PCM数据保存为二进制文件并提供下载链接
function savePCMFile(pcmData) {
    const pcmBlob = new Blob([new Int16Array(pcmData)], { type: 'audio/raw' });

    // 创建下载链接
    const url = URL.createObjectURL(pcmBlob);

    // 创建下载按钮
    const downloadButton = document.createElement('a');
    downloadButton.href = url;
    downloadButton.download = 'audio.pcm';
    downloadButton.innerHTML = 'Download PCM';

    // 将按钮添加到文档中
    document.body.appendChild(downloadButton);

    // 模拟点击按钮进行下载
    downloadButton.click();
}

function saveWavFile(pcmData, sampleRate=44100) {
    const wavData = convertPCMToWav(pcmData, sampleRate);

    // 创建Blob对象
    const blob = new Blob([wavData], { type: 'audio/wav' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);

    // 创建下载按钮
    const downloadButton = document.createElement('a');
    downloadButton.href = url;
    downloadButton.download = 'audio.wav';
    downloadButton.innerHTML = 'Download WAV';

    // 将按钮添加到文档中
    document.body.appendChild(downloadButton);

    // 模拟点击按钮进行下载
    downloadButton.click();
}

// 将PCM数据转换为WAV格式
function convertPCMToWav(pcmData, sampleRate) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);

    // WAV文件头部
    view.setUint8(0, 'R'.charCodeAt(0));
    view.setUint8(1, 'I'.charCodeAt(0));
    view.setUint8(2, 'F'.charCodeAt(0));
    view.setUint8(3, 'F'.charCodeAt(0));
    view.setUint32(4, 36 + pcmData.length * 2, true);
    view.setUint8(8, 'W'.charCodeAt(0));
    view.setUint8(9, 'A'.charCodeAt(0));
    view.setUint8(10, 'V'.charCodeAt(0));
    view.setUint8(11, 'E'.charCodeAt(0));
    view.setUint8(12, 'f'.charCodeAt(0));
    view.setUint8(13, 'm'.charCodeAt(0));
    view.setUint8(14, 't'.charCodeAt(0));
    view.setUint8(15, ' '.charCodeAt(0));
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint8(36, 'd'.charCodeAt(0));
    view.setUint8(37, 'a'.charCodeAt(0));
    view.setUint8(38, 't'.charCodeAt(0));
    view.setUint8(39, 'a'.charCodeAt(0));
    view.setUint32(40, pcmData.length * 2, true);

    // 将PCM数据写入buffer
    pcmData.forEach((sample, index) => {
      view.setInt16(44 + index * 2, sample * 0x7FFF, true);
    });

    return buffer;
}

const [start, stop] = function() {
    let audioContext;
    let mediaStream;
    let mediaStreamSource;
    let scriptNode;
    let pcmData;

    function start() {
        audioContext = new AudioContext();
        pcmData = [];
        navigator
            .mediaDevices
            .getUserMedia({ audio: true })
            .then(stream => {
                mediaStream = stream;
                // 创建媒体流节点
                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                
                // 创建ScriptProcessorNode用于处理音频数据
                scriptNode = audioContext.createScriptProcessor(4096, 1, 1); // bufferSize, inputChannels, outputChannels

                // 连接节点
                mediaStreamSource.connect(scriptNode);
                scriptNode.connect(audioContext.destination);
                // 处理音频数据

                scriptNode.onaudioprocess = function (audioProcessingEvent) {
                    const inputBuffer = audioProcessingEvent.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0); // 获取音频数据
                    // 在这里可以对音频数据进行处理，例如转换为PCM格式
                    // 输出 PCM 数据
                    pcmData = pcmData.concat(Array.from(inputData));
                };
            })
            .catch(error => {
                console.error('Error accessing user media:', error);
            });
    }

    function stop() {
        mediaStream.getTracks().forEach((track) => track.stop());
        scriptNode.disconnect();

        savePCMFile(pcmData);
        // saveWavFile(pcmData, audioContext.sampleRate);
    }

    return [start, stop];
}();

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
