import { 
    OrthographicCamera, 
    Scene, 
    WebGLRenderTarget, 
    LinearFilter, 
    NearestFilter, 
    RGBAFormat, 
    UnsignedByteType, 
    CfxTexture,
    ShaderMaterial, 
    PlaneGeometry, 
    Mesh, 
    WebGLRenderer 
} from "./three.js";

export default class Screen {
    constructor(webhooks) {
        this.webhooks = webhooks;
        
        this._updateDimensions();
        
        this._initialize();
        
        this._boundAnimationLoop = this._animationLoop.bind(this);
        this._boundHandleResize = this._handleResize.bind(this);
        
        window.addEventListener('resize', this._boundHandleResize, { passive: true });
        this._boundAnimationLoop();
    }

    _updateDimensions() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    _initialize() {
        this.renderer = new WebGLRenderer({
            powerPreference: 'high-performance',
            antialias: false
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.autoClear = false;

        this.camera = new OrthographicCamera(
            this.width / -2, this.width / 2,
            this.height / 2, this.height / -2,
            -10000, 10000
        );

        this.scene = new Scene();
        this.renderTarget = new WebGLRenderTarget(this.width, this.height, {
            minFilter: LinearFilter,
            magFilter: NearestFilter,
            format: RGBAFormat,
            type: UnsignedByteType,
            stencilBuffer: false,
            depthBuffer: false
        });

        const gameTexture = new CfxTexture();
        gameTexture.needsUpdate = true;
        
        this.material = new ShaderMaterial({
            uniforms: { 
                tDiffuse: { value: gameTexture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = vec2(uv.x, 1.0 - uv.y);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D tDiffuse;
                void main() {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                }
            `
        });

        const plane = new PlaneGeometry(this.width, this.height);
        const quad = new Mesh(plane, this.material);
        quad.scale.y = -1;
        this.scene.add(quad);
    }

    _handleResize() {
        this._updateDimensions();
        
        this.camera.left = this.width / -2;
        this.camera.right = this.width / 2;
        this.camera.top = this.height / 2;
        this.camera.bottom = this.height / -2;
        this.camera.updateProjectionMatrix();

        this.renderTarget.setSize(this.width, this.height);
        this.renderer.setSize(this.width, this.height);
        
        const quad = this.scene.children[0];
        quad.geometry.dispose();
        quad.geometry = new PlaneGeometry(this.width, this.height);
    }

    _animationLoop() {
        requestAnimationFrame(this._boundAnimationLoop);
        this.renderer.clear();
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
    }

    recordMedia() {
        const canvas = this.renderer.domElement;
        const videoStream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(videoStream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        const chunks = [];
        
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.start();

        return {
            stop: () => new Promise(resolve => {
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    resolve(URL.createObjectURL(blob));
                };
                mediaRecorder.stop();
            })
        };
    }

    async sendDiscord(data, type) {
        let blob;
        if (type === 'mp4') {
            const response = await fetch(data);
            blob = await response.blob();
        } else if (type === 'webp') {
            const base64Data = data.split(',')[1];
            const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            blob = new Blob([byteArray], { type: 'image/webp' });
        }

        if (!blob) return;

        const formData = new FormData();
        formData.append('file', blob, `${Date.now()}.${type}`);

        try {
            const response = await fetch(this.webhooks, { 
                method: 'POST', 
                body: formData 
            });
            const responseData = await response.json();
            return responseData.attachments[0].url;
        } catch (error) {
            throw error;
        }
    }

    async takeScreenshot(target_color) {
        this.renderer.render(this.scene, this.camera, this.renderTarget, true);
        
        const read = new Uint8Array(this.width * this.height * 4);
        this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, this.width, this.height, read);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');

        const d = new Uint8ClampedArray(read.buffer);
        const imageData = new ImageData(d, this.width, this.height);
        
        tempCtx.putImageData(imageData, 0, 0);

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = this.width;
        finalCanvas.height = this.height;
        const finalCtx = finalCanvas.getContext('2d');

        finalCtx.translate(0, this.height);
        finalCtx.scale(1, -1);
        finalCtx.drawImage(tempCanvas, 0, 0);


        if (target_color) {
            const frame = finalCtx.getImageData(0, 0, this.width, this.height);
            const data = frame.data;

            const chunkSize = 1000;
            for (let i = 0; i < data.length; i += chunkSize * 4) {
                const end = Math.min(i + chunkSize * 4, data.length);
                for (let j = i; j < end; j += 4) {
                    if (
                        Math.abs(data[j] - target_color.r) <= 100 &&
                        Math.abs(data[j + 1] - target_color.g) <= 100 &&
                        Math.abs(data[j + 2] - target_color.b) <= 100
                    ) {
                        data[j + 3] = 0;
                    }
                }
            }

            finalCtx.putImageData(frame, 0, 0);
        }

        const blob = await finalCanvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }

    dispose() {
        window.removeEventListener('resize', this._boundHandleResize);
        this.material.dispose();
        this.scene.children[0].geometry.dispose();
        this.renderTarget.dispose();
        this.renderer.dispose();
    }
}