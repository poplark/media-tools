import MRTC from 'mrtc-sdk';
import { Rotator } from './rotate';

let rotator: Rotator | undefined;

export async function enableWebcam(sdk: MRTC, deviceId: string) {
    const constraints: MediaTrackConstraints = {
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
    }
    if (deviceId) {
        constraints.deviceId = deviceId;
    }
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
    } catch (err: unknown) {
        console.warn('获取摄像头画面失败', err);
        return {
            code: -1,
            reason: (err as Error).message,
        }
    }
    const videoTrack = stream.getVideoTracks()[0];
    let rotatedTrack;
    try {
      rotator = new Rotator(videoTrack);
      // 获取当前旋转角度 - 竖屏幕
      const angle = getAngle();
      rotatedTrack = await rotator.capture(angle);
    } catch (err: unknown) {
        console.warn('旋转画面角度失败', err);
        return {
            code: -1,
            reason: (err as Error).message,
        }
    }
    window.addEventListener("orientationchange", checkOrientation);
    return await sdk.startCustomVideoStream(rotatedTrack);
}

export async function disableWebcam(sdk: MRTC) {
    const result = await sdk.stopCustomVideoStream();
    rotator && rotator.destroy();
    window.removeEventListener("orientationchange", checkOrientation);
    rotator = undefined;
    return result;
}

function checkOrientation() {
    // 获取当前屏幕方向
    const orientation = window.orientation;
    // 判断是否为横屏模式
    if (orientation === 90 || orientation === -90) {
        console.log('手机处于横屏模式');
        rotator && rotator.rotate(0);
    } else {
        console.log('手机处于竖屏模式');
        rotator && rotator.rotate(90);
    }
}

function getAngle() {
    let angle = 90;
    if (window.matchMedia("(orientation: portrait)").matches) {
        console.debug("竖屏模式");
    } else if (window.matchMedia("(orientation: landscape)").matches) {
        console.debug("横屏模式");
        angle = 0;
    }
    return angle;
}
