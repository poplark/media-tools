import { Rotator } from './rotate.js';

const originalVideoElem = document.getElementById('origin');
const rotatedVideoElem = document.getElementById('rotated');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
let angle = 0;

async function run() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    originalVideoElem.srcObject = stream;

    const originalTrack = stream.getVideoTracks()[0];

    const rotator = new Rotator(originalTrack);

    const videoTrack = await rotator.capture(angle);
    const newStream = new MediaStream();
    newStream.addTrack(videoTrack);

    rotatedVideoElem.srcObject = newStream;

    function rotate(arc) {
        angle = angle + arc;
        if (angle >= 360) {
            angle = angle - 360;
        } else if (angle < 0) {
            angle = 360 + angle;
        }
        rotator.rotate(angle);
    }
    function left() {
        rotate(-10);
    }
    function right() {
        rotate(10);
    }
    leftBtn.addEventListener('click', left);
    rightBtn.addEventListener('click', right);
}

run();
