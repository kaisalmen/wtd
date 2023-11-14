import { OffscreenPayload } from 'wtd-core';

export const getOffScreenCanvas = (offScreenPayload?: OffscreenPayload) => {
    return offScreenPayload ? offScreenPayload.message.drawingSurface as HTMLCanvasElement : undefined;
};

export const updateText = (params: {
    text: string;
    width: number;
    height: number;
    canvas?: HTMLCanvasElement;
    log?: boolean;
}) => {
    const context = params.canvas?.getContext('2d');
    if (context) {
        context.clearRect(0, 0, params.width, params.height);
        context.font = '12px Arial';
        context?.fillText(params.text, 12, 48);
    }
    if (params.log === true) {
        console.log(params.text);
    }
};

export const recalcAspectRatio = (canvas: HTMLCanvasElement) => {
    canvas.width = canvas.height * (canvas.clientWidth / canvas.clientHeight);
    return canvas.width;
};
