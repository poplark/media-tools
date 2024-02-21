interface NewType {
    mozRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    webkitRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    msRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    oRequestAnimationFrame?: (callback: FrameRequestCallback) => number;

    mozCancelAnimationFrame?: (handle: number) => void;
    webkitCancelAnimationFrame?: (handle: number) => void;
    msCancelAnimationFrame?: (handle: number) => void;
    oCancelAnimationFrame?: (handle: number) => void;
}

const requestAnimationFrame =
    window.requestAnimationFrame ||
    (window as NewType).mozRequestAnimationFrame ||
    (window as NewType).webkitRequestAnimationFrame ||
    (window as NewType).msRequestAnimationFrame ||
    (window as NewType).oRequestAnimationFrame;

const cancelAnimationFrame =
    window.cancelAnimationFrame ||
    (window as NewType).mozCancelAnimationFrame ||
    (window as NewType).webkitCancelAnimationFrame ||
    (window as NewType).msCancelAnimationFrame ||
    (window as NewType).oCancelAnimationFrame;

export function getAF(
    frameRate = 20,
    forceUseSetTimeout = false,
): [(callback: FrameRequestCallback) => number, (handle: number) => void, boolean] {
    let raf = function (callback: FrameRequestCallback): number {
        let interval = 1000 / frameRate;
        if (interval < 50) {
            interval = 50;
        }
        return window.setTimeout(callback, interval);
    };
    let caf = function (id: number) {
        return window.clearTimeout(id);
    }
    raf = forceUseSetTimeout ? raf : requestAnimationFrame ? requestAnimationFrame.bind(window) : raf;
    caf = forceUseSetTimeout ? caf : cancelAnimationFrame ? cancelAnimationFrame.bind(window) : caf;
    const isOriginalRAF = forceUseSetTimeout ? false : !!requestAnimationFrame;
    return [raf, caf, isOriginalRAF];
}

export class Rotator {
    private width = 640;
    private height = 480;
    private frameRate = 30;
    private mediaStream: MediaStream;

    private videoElem: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null;

    private raf: (callback: FrameRequestCallback) => number;
    private caf: (handle: number) => void;
    private isOriginalRAF = false;
    private renderTimer: number = 0;

    private angle = 0;

    constructor(track: MediaStreamTrack) {
        const { width = 640, height = 360, frameRate = 30 } = track.getSettings();
        this.mediaStream = new MediaStream();
        this.mediaStream.addTrack(track);
        this.width = width;
        this.height = height;
        this.frameRate = frameRate;

        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');

        [this.raf, this.caf, this.isOriginalRAF] = getAF(this.frameRate);

        this.videoElem = document.createElement('video');
        this.videoElem.setAttribute('playsinline', '');
        this.videoElem.setAttribute('webkit-playsinline', '');  // 针对一些老版本的 Safari
        this.videoElem.srcObject = this.mediaStream;

        const self = this;
        this.videoElem.onplay = function() {
            self.startRenderFrame();
        }
        this.videoElem.onpause = function() {
            console.warn('video paused');
            if (self.videoElem.srcObject) {
                // try to resume playing
                self.videoElem.play().catch((err) => {
                    console.warn('video play err', err);
                });
            }
        }
        track.onended = function() {
            self.stopRenderFrame();
        }
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    private handleVisibilityChange = () => {
        if (document.hidden) {
            // requestAnimationFrame 降级成 setTimeout
            const [raf, caf, isOriginalRAF] = getAF(this.frameRate, true);
            if (isOriginalRAF !== this.isOriginalRAF) {
                this.stopRenderFrame();
                [this.raf, this.caf, this.isOriginalRAF] = [raf, caf, isOriginalRAF];
                this.startRenderFrame();
            }
        } else {
            const [raf, caf, isOriginalRAF] = getAF(this.frameRate);
            if (isOriginalRAF !== this.isOriginalRAF) {
                this.stopRenderFrame();
                [this.raf, this.caf, this.isOriginalRAF] = [raf, caf, isOriginalRAF];
                this.startRenderFrame();
            }
        }
    }

    private startRenderFrame() {
        this.renderTimer && this.caf(this.renderTimer);
        this.ctx?.clearRect(0, 0, this.width, this.height);
        // 保存当前状态
        this.ctx?.save();
        // 将坐标原点移动到画布中心
        this.ctx?.translate(this.width / 2, this.height / 2);
        // 旋转
        this.ctx?.rotate((this.angle * Math.PI) / 180);
        // 将视频画面绘制到 Canvas 上
        let width = this.width;
        let height = this.height;
        let originalWidth = this.videoElem.videoWidth;
        if (width !== originalWidth && this.angle % 180 !== 0) {
            const p = width;
            width = height;
            height = p;
        }
        this.ctx?.drawImage(this.videoElem, -width / 2, -height / 2, width, height);
        // 恢复之前保存的状态
        this.ctx?.restore();
        this.renderTimer = this.raf(this.startRenderFrame.bind(this));
    }

    private stopRenderFrame = (): void => {
        this.caf(this.renderTimer);
        this.renderTimer = 0;
    };

    async capture(angle = 0) {
        this.angle = angle;
        await this.videoElem.play();

        const stream = this.canvas.captureStream(this.frameRate);
        const track = stream.getVideoTracks()[0];
        if (!track) {
            throw new Error('not support');
        }
        return track;
    }

    rotate(angle = 0) {
        this.angle = angle;
    }

    stopCapture() {
        this.stopRenderFrame();
    }

    destroy() {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.stopCapture();
        const tracks = this.mediaStream.getTracks();
        for (const track of tracks) {
            track.stop();
        }
        this.videoElem.srcObject = null;
        if (typeof this.videoElem.remove === 'function') {
            this.videoElem.remove();
        }
    }
}
