class Image {
    constructor(camera, index) {
        this.root = camera.root;
        this.config = camera.config;
        this.loader = camera.loader;
        this.scene = camera.scene;
        this.stage = camera.stage;
        this.forest = camera.forest;
        this.drone = camera.drone;
        this.camera = camera;
        this.index = index;

        this.center = this.camera.center;
        this.coverage = this.camera.coverage;
        this.rotation = this.camera.rotation;

        this.plane = this.camera.getPlane();
        this.resolution = this.camera.getResolution();
        this.type = this.config.drone.camera.type;

        this.borderPoints = this.camera.viewLines.map(getPoints);
        this.rendering = cloneCanvas(this.camera.renderer.domElement, this.type === 'monochrome');

        this.loaded = new Promise(async function (resolve) {
            resolve(this);
        }.bind(this));
    }

    async capture(preview) {
        return this.captureImage(preview).then((images) => {
            if (preview) {
                return this.integrateImages(images);
            }
        });
    }

    async getPixels() {
        // TODO remove or refactor person pixel matching
        return [];

        // get person pixel color
        const color = rgbColor(this.config.material.color.person);

        // get canvas pixel data
        const ctx = this.rendering.getContext('2d');
        const data = ctx.getImageData(0, 0, this.rendering.width, this.rendering.height);
        const pixels = data.data;

        // check canvas pixel color
        const visiblePixels = [];
        for (let i = 0; i < pixels.length; i += 4) {
            const pixelColor = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };

            // check if person color matches canvas pixel color 
            if (colorMatch(color, pixelColor, 1)) {
                visiblePixels.push(new THREE.Vector3(
                    (i / 4) % this.rendering.width,
                    0,
                    Math.floor((i / 4) / this.rendering.height)
                ));
            }
        }

        return visiblePixels;
    }

    async captureImage(preview) {
        // get visible and border points
        const visiblePoints = preview ? await this.getPixels() : [];

        // get min values for each axes
        const min = new THREE.Vector3(
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].x; })),
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].y; })),
            Math.min.apply(Math, this.borderPoints.map((p) => { return p[1].z; }))
        );

        // subtract min point value for each border points axes
        const borderPointsGround = this.borderPoints.map((p) => { return p.map((a) => { return a.sub(min); })[1]; });

        // get max values for each axes
        const max = new THREE.Vector3(
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.x; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.y; })),
            Math.max.apply(Math, borderPointsGround.map((p) => { return p.z; }))
        );

        // convert simulation coordinates (meter) into image coordinates (pixel)
        const capture = {
            number: this.index + 1,
            rendered: {
                center: new THREE.Vector3(
                    this.center.x,
                    0,
                    this.center.z
                ),
                points: visiblePoints.map((p) => {
                    return new THREE.Vector3(
                        p.x * max.x / this.resolution.x,
                        0,
                        p.z * max.z / this.resolution.z
                    );
                })
            },
            processed: {
                center: new THREE.Vector3(
                    Math.round(this.center.x * this.resolution.x / max.x),
                    0,
                    Math.round(this.center.z * this.resolution.z / max.z)
                ),
                points: visiblePoints
            }
        };

        // canvas image
        const canvas = this.rendering;

        // save base64 image
        capture.base64 = canvasImage(canvas);

        if (preview) {
            // canvas container
            const container = document.createElement('div');
            container.className = 'image';

            // append image
            container.append(canvas);
            this.camera.slider.addImage(container);
        }

        // append capture to camera
        this.camera.captures.push(capture);

        // return last captures
        return this.camera.captures.slice(Math.max(this.camera.captures.length - this.config.drone.camera.captures, 0));
    }

    async integrateImages(images) {
        // canvas image
        const canvas = cloneCanvas(this.rendering, this.type === 'monochrome');
        const ctx = canvas.getContext('2d');

        // draw pixel points
        const center = images[images.length - 1].processed.center;
        images.forEach((image) => {

            // delta from current center to captured images
            const delta = new THREE.Vector3();
            delta.copy(center).sub(image.processed.center);

            image.processed.points.forEach((p) => {
                ctx.fillStyle = hexColor(this.config.material.color.person);
                ctx.fillRect(p.x - delta.x, p.z - delta.z, 1, 1);
            });
        });

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // append preview
        container.append(canvas);
        this.camera.slider.addPreview(container);

        // return image index
        return images.length - 1;
    }
};