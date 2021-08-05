class Camera {
    constructor(drone, index) {
        this.root = drone.root;
        this.config = drone.config;
        this.scene = drone.scene;
        this.stage = drone.stage;
        this.forest = drone.forest;
        this.drone = drone;
        this.index = index;

        const { center, coverage, rotation } = this.drone.getView();

        this.center = center;
        this.coverage = coverage;
        this.rotation = rotation;

        this.rays = [];
        this.boxes = [];

        this.planes = [];
        this.images = [];

        this.planeMaterial = new THREE.MeshStandardMaterial({
            color: this.config.material.color.plane,
            side: THREE.DoubleSide
        });

        this.textMaterial = new THREE.MeshPhongMaterial({
            color: 0x990000,
            specular: 0xff2222
        });

        // view lines
        this.viewLines = [];
        for (let i = 0; i < 4; i++) {
            const viewLinePoints = [new THREE.Vector3(0, this.config.drone.height, 0), new THREE.Vector3(0, 0, 0)];
            const viewLineGeometry = new THREE.BufferGeometry().setFromPoints(viewLinePoints);
            this.viewLines.push(new THREE.Line(viewLineGeometry, new THREE.LineBasicMaterial({ color: 0x990000 })));
        }

        // plane
        const rectangleGeometry = new THREE.PlaneGeometry();
        rectangleGeometry.rotateX(rad(-90));
        const rectangle = new THREE.Mesh(rectangleGeometry, this.planeMaterial);

        // plane border
        const border = new THREE.EdgesHelper(rectangle, 0x990000);
        border.matrixAutoUpdate = true;

        // plane text
        const textGeometry = new THREE.TextGeometry('', { font: this.stage.font });
        textGeometry.rotateX(rad(-90));
        const text = new THREE.Mesh(textGeometry, this.textMaterial);
        text.userData = { clone: text.clone() };

        // init plane
        this.plane = {
            rectangle: rectangle,
            border: border,
            text: text
        };

        // init slider
        this.slider = new Slider(document.querySelector('#captures'), this.config);

        // move objects to layer 1 (invisible for preview camera)
        this.plane.border.layers.set(1);
        this.plane.text.layers.set(1);
        this.viewLines.forEach((viewLine) => {
            viewLine.layers.set(1);
        });

        this.loaded = new Promise(function (resolve) {
            this.addView();
            this.addPlane();
            this.addRenderer();
            this.addPreview();
            this.update();

            resolve(this);
        }.bind(this));
    }

    addView() {
        const view = new THREE.Group();
        this.viewLines.forEach((viewLine) => {
            view.add(viewLine);
        });
        this.scene.add(view);
    }

    addPlane() {
        this.scene.add(this.plane.rectangle);
        this.scene.add(this.plane.border);
        this.scene.add(this.plane.text);
    }

    addRenderer() {
        // preview image camera (layer 0)
        this.camera = new THREE.PerspectiveCamera(this.config.drone.camera.view, 1, 0.1, 1000);
        this.camera.layers.enable(0);
        this.scene.add(this.camera);

        // render preview image
        this.renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    addPreview() {
        const resolution = this.getResolution();

        // preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image';

        // preview image
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = resolution.x;
        previewCanvas.height = resolution.z;

        // preview background
        const previewContext = previewCanvas.getContext('2d');
        previewContext.fillStyle = hexColor(this.config.material.color.plane);
        previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewContainer.append(previewCanvas);

        // render container
        const renderContainer = document.createElement('div');
        renderContainer.className = 'image';
        renderContainer.append(this.renderer.domElement);

        // append to slider
        this.slider.previews.append(previewContainer);
        this.slider.previews.append(renderContainer);
    }

    getResolution() {
        return new THREE.Vector3(this.config.drone.camera.resolution, 0, this.config.drone.camera.resolution);
    }

    getPlane() {
        // rectangle
        const rectangle = this.plane.rectangle.clone();
        rectangle.material = this.plane.rectangle.material.clone();
        rectangle.geometry = this.plane.rectangle.geometry.clone();

        // plane group
        const plane = new THREE.Group();
        plane.add(rectangle);
        plane.translateY(0);

        // add to scene
        this.scene.add(plane);
        this.planes.push(plane);

        return rectangle;
    }

    getText() {
        let planeText = this.plane.text.userData.clone;
        let { offset, coverage, rotation } = planeText.userData;

        const updateText = this.coverage !== coverage || this.rotation !== rotation;
        if (updateText) {
            // plane text
            const text = this.coverage.toFixed(2) + ' x ' + this.coverage.toFixed(2);
            const textGeometry = new THREE.TextGeometry(text, { font: this.stage.font, size: this.coverage / 10, height: 0.01 });
            textGeometry.rotateX(rad(-90))
            planeText.geometry.copy(textGeometry);

            // plane text width/height
            const textSize = new THREE.Vector3();
            new THREE.Box3().setFromObject(planeText).getSize(textSize);

            // plane text center offset
            offset = Math.sqrt((textSize.x / 2) ** 2 + (textSize.z / 2) ** 2);
        }

        // update text data
        planeText.userData = {
            offset: offset,
            center: this.center,
            coverage: this.coverage,
            rotation: this.rotation
        };

        // plane text position 
        const x = this.center.x - offset * Math.cos(this.rotation);
        const z = this.center.z + offset * Math.sin(this.rotation);

        return {
            text: planeText,
            position: new THREE.Vector3(x, 0.005, z)
        };
    }

    async capture(preview) {
        const image = new Image(this, this.images.length);
        return await image.capture(preview);
    }

    async update() {
        const { center, coverage, rotation } = this.drone.getView();

        // update properties
        this.center = center;
        this.coverage = coverage;
        this.rotation = rotation;

        // view corners (right-top, left-top, left-bottom, right-bottom])
        const cornerAngles = [45, 135, 225, 315];
        const cornerDistance = Math.sqrt((coverage / 2) ** 2 + (coverage / 2) ** 2);

        // update view lines 
        this.viewLines.forEach((viewLine, i) => {
            const theta = rad(cornerAngles[i]) - rotation;
            const x = center.x + cornerDistance * Math.cos(theta);
            const z = center.z + cornerDistance * Math.sin(theta);

            const from = new THREE.Vector3(center.x, center.y, center.z);
            const to = new THREE.Vector3(x, 0, z);
            viewLine.geometry.setFromPoints([from, to]);
        });

        // update plane
        this.plane.rectangle.scale.set(coverage, 1, coverage);
        this.plane.rectangle.position.set(center.x, 0.01, center.z);
        this.plane.rectangle.setRotationFromEuler(new THREE.Euler(0, rotation, 0));

        // update plane border
        this.plane.border.scale.set(coverage, 1, coverage);
        this.plane.border.position.set(center.x, 0.01, center.z);
        this.plane.border.setRotationFromEuler(new THREE.Euler(0, rotation, 0));

        // update plane text
        const { position } = this.getText();
        this.plane.text.setRotationFromEuler(new THREE.Euler(0, rotation, 0));
        this.plane.text.position.set(position.x, 0.005, position.z);

        // update camera position
        this.camera.fov = this.config.drone.camera.view;
        this.camera.position.set(center.x, center.y, center.z);
        this.camera.lookAt(center.x, 0, center.z);
        this.camera.rotateZ(rotation);
        this.camera.updateProjectionMatrix();

        // render camera preview
        this.renderer.setSize(this.config.drone.camera.resolution, this.config.drone.camera.resolution);
        this.renderer.domElement.removeAttribute('style');
        this.renderer.render(this.scene, this.camera);
    }

    async export(zip) {
        const camera = zip.folder('camera');

        const images = { captures: [] };
        this.images.forEach((image, index) => {
            // TODO use image.index
            const number = index + 1;

            // TODO add rotation
            images.captures.push({
                image: number,
                center: {
                    rendered: image.rendered.center,
                    processed: image.processed.center
                }
            });

            // export images
            // camera.file(`image-${number}.png`, image.rendered.base64, { base64: true });
            camera.file(`image-${number}-${this.config.drone.camera.type}.png`, image.processed.base64, { base64: true });
        });

        // export config
        camera.file('camera.json', JSON.stringify(images, null, 4));
    }

    async clear() {
        // clear planes
        this.planes.forEach((capture) => { this.scene.remove(capture); });
        this.planes = [];

        // clear rays
        this.rays.forEach((ray) => { this.scene.remove(ray); });
        this.rays = [];

        // clear boxes
        this.boxes.forEach((ray) => { this.scene.remove(ray); });
        this.boxes = [];

        // clear images
        this.images = [];
        await this.slider.clear();

        // add initial preview
        this.addPreview();
    }

    async reset() {
        await this.clear();
        await this.update();

        await sleep(100);
    }
};
