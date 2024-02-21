const requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.oRequestAnimationFrame;

const cancelAnimationFrame =
    window.cancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.msCancelAnimationFrame ||
    window.oCancelAnimationFrame;

export function getAF(frameRate = 20) {
    let raf = function (callback) {
        let interval = 1000 / frameRate;
        if (interval < 50) {
            interval = 50;
        }
        return window.setTimeout(callback, interval);
    };
    let caf = window.clearTimeout;
    raf = requestAnimationFrame ? requestAnimationFrame.bind(window) : raf;
    caf = cancelAnimationFrame ? cancelAnimationFrame.bind(window) : caf;
    return [raf, caf];
}

export class Rotator {
    _width = 640;
    _height = 480;
    _frameRate = 30;
    // _mediaStream: MediaStream;

    // _videoElem: HTMLVideoElement;
    // _canvas: HTMLCanvasElement;
    // _ctx: CanvasRenderingContext2D | null;

    // _raf: (callback: FrameRequestCallback) => number;
    // _caf: (handle: number) => void;
    _renderTimer = 0;

    _angle = 0;

    constructor(track) {
        const { width = 640, height = 360, frameRate = 30 } = track.getSettings();
        this._mediaStream = new MediaStream();
        this._mediaStream.addTrack(track);
        this._width = width;
        this._height = height;
        this._frameRate = frameRate;

        this._canvas = document.createElement('canvas');
        this._canvas.width = width;
        this._canvas.height = height;
        this._ctx = this._canvas.getContext('2d');

        [this._raf, this._caf] = getAF(this._frameRate);

        this._videoElem = document.createElement('video');
        this._videoElem.srcObject = this._mediaStream;

        const self = this;
        this._videoElem.onplay = function() {
            self._startRenderFrame();
        }
        this._videoElem.onpause = function() {
            // 解决 iOS 里自动停止播放的问题
            console.warn('video paused');
            if (self._videoElem.srcObject) {
                self._videoElem.play().catch(err => {
                    console.warn('try to resume the playing failed', err);
                });
            }
        }
        track.onended = function() {
            self._stopRenderFrame();
        }
    }

    _startRenderFrame() {
        this._ctx?.clearRect(0, 0, this._width, this._height);
        // 保存当前状态
        this._ctx?.save();
        // 将坐标原点移动到画布中心
        this._ctx?.translate(this._width / 2, this._height / 2);
        // 旋转
        this._ctx?.rotate((this._angle * Math.PI) / 180);
        // 将视频画面绘制到 Canvas 上
        this._ctx?.drawImage(this._videoElem, -this._width / 2, -this._height / 2, this._width, this._height);
        // 恢复之前保存的状态
        this._ctx?.restore();
        this._renderTimer = this._raf(this._startRenderFrame.bind(this));
    }

    _stopRenderFrame = () => {
        this._caf(this._renderTimer);
        this._renderTimer = 0;
    };

    async capture(angle = 0) {
        this._angle = angle;
        await this._videoElem.play();

        const stream = this._canvas.captureStream(this._frameRate);
        const track = stream.getVideoTracks()[0];
        if (!track) {
            throw new Error('not support');
        }
        return track;
    }

    rotate(angle = 0) {
        this._angle = angle;
    }

    stopCapture() {
        this._stopRenderFrame();
    }

    destroy() {
        this._stopCapture();
        const tracks = this._mediaStream.getTracks();
        for (const track of tracks) {
            track.stop();
        }
    }
}
