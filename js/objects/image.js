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

        // TODO remove
        this.borderPoints = this.camera.viewLines.map(getPoints);

        this.canvas = {
            trees: this.getCanvas([
                this.stage.layer.trees
            ]),
            persons: this.getCanvas([
                this.stage.layer.persons,
                this.stage.layer.camera
            ]),
            full: this.getCanvas([
                this.stage.layer.trees,
                this.stage.layer.persons,
                this.stage.layer.camera
            ])
        };

        this.loaded = new Promise(async function (resolve) {
            resolve(this);
        }.bind(this));
    }

    getCanvas(layers) {
        // enable desired layers
        this.camera.setLayers(layers);

        // clone canvas
        const canvas = cloneCanvas(this.camera.renderer.domElement, this.type === 'monochrome');

        // enable default layers
        this.camera.setLayers(this.camera.layers);

        return canvas;
    }

    async capture(preview) {
        return this.captureImage(preview).then((captures) => {
            if (preview) {
                return this.integrateImages(captures);
            }
        });
    }

    async captureImage(preview) {
        // TODO remove
        const visiblePoints = [];

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
        const canvas = this.canvas.full;

        // save image
        capture.canvas = canvas;
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
        return this.camera.captures.slice(Math.max(this.camera.captures.length - this.config.drone.camera.images, 0));
    }

    async integrateImages(captures) {
        // canvas image
        const canvas = this.canvas.trees;
        const ctx = canvas.getContext('2d');

        // only trees black
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(this.canvas.full, 0, 0);

        const center = captures[captures.length - 1].processed.center;
        captures.forEach((capture) => {

            // delta from current center to captured images
            const delta = new THREE.Vector3();
            delta.copy(center).sub(capture.processed.center);

            // choose lightest pixel between black trees and ground
            ctx.globalCompositeOperation = 'lighten';
            ctx.drawImage(capture.canvas, -delta.x, -delta.z);
        });

        // canvas image
        const canvas1 = this.canvas.persons;
        const ctx1 = canvas1.getContext('2d');

        // add last image persons to integrated
        ctx1.globalCompositeOperation = 'darken';
        ctx1.drawImage(canvas, 0, 0);

        captures.forEach((capture) => {

            // delta from current center to captured images
            const delta = new THREE.Vector3();
            delta.copy(center).sub(capture.processed.center);

            //ctx1.filter = 'invert(1)'
            //ctx1.globalCompositeOperation = 'lighten';
            //ctx1.drawImage(capture.canvas, -delta.x, -delta.z);
        });

        // canvas container
        const container = document.createElement('div');
        container.className = 'image';

        // append preview
        container.append(canvas1);
        this.camera.slider.addPreview(container);

        // return image index
        return captures.length - 1;
    }
};