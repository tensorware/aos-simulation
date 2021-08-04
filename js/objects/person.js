class Person {
    constructor(forest, index) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;
        this.index = index;

        const width = 1;
        const height = 2;

        const segments = 4;
        const widthSegments = width * segments;
        const heightSegments = height * segments;

        const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        planeGeometry.rotateX(rad(-90)).translate(0, 0.10, 0);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: this.config.material.color.person });

        const wireGeometry = new THREE.WireframeGeometry(planeGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: this.config.material.color.person });

        this.wire = new THREE.LineSegments(wireGeometry, wireMaterial);
        this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        this.mesh.add(this.wire);

        // ###############################################

        // initial position and direction
        this.position = new THREE.Vector3(
            0.0, // randomFloat(personPositionMin, personPositionMax, index), // TEMP
            0.02,
            0.0  // randomFloat(personPositionMin, personPositionMax, index) // TEMP
        );
        this.direction = randomInt(0, 360, index);

        this.currentPosition = this.position.clone();
        this.currentDirection = this.direction;

        this.allActions = [];
        this.baseActions = {
            idle: { weight: 1 },
            walk: { weight: 0 },
            run: { weight: 0 }
        };
        this.currentBaseAction = 'idle';

        this.additiveActions = {
            sneak_pose: { weight: 0 },
            sad_pose: { weight: 0 },
            agree: { weight: 0 },
            headShake: { weight: 0 }
        };

        this.clock = new THREE.Clock();
        this.active = false;

        this.loaded = new Promise(function (resolve) {
            new THREE.GLTFLoader().load('models/person.glb', ((gltf) => {
                this.person = gltf.scene;
                this.person.traverse((obj) => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                    }
                });

                this.mixer = new THREE.AnimationMixer(this.person);

                this.numAnimations = gltf.animations.length;
                for (let i = 0; i < this.numAnimations; ++i) {
                    let clip = gltf.animations[i];

                    const name = clip.name;
                    if (this.baseActions[name]) {
                        const action = this.mixer.clipAction(clip);
                        this.activateAction(action);
                        this.baseActions[name].action = action;
                        this.allActions.push(action);
                    }
                    else if (this.additiveActions[name]) {
                        THREE.AnimationUtils.makeClipAdditive(clip);
                        if (clip.name.endsWith('_pose')) {
                            clip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);
                        }

                        const action = this.mixer.clipAction(clip);
                        this.activateAction(action);
                        this.additiveActions[name].action = action;
                        this.allActions.push(action);
                    }
                }

                this.addPerson();
                this.update();

                let startAction = this.baseActions['idle'].action;
                let endAction = this.baseActions[this.getAction()].action;
                this.prepareCrossFade(startAction, endAction, 0.35);

                this.active = true;
                this.animate = this.animate.bind(this);
                requestAnimationFrame(this.animate);

                resolve(this);
            }).bind(this));
        }.bind(this));
    }

    addPerson() {
        this.setPosition(this.position, this.direction);
        this.scene.add(this.person);
    }

    getAction() {
        const activityMapping = {
            'lying': 'idle',
            'sitting': 'idle',
            'standing': 'idle',
            'waving': 'idle',
            'injured': 'idle',
            'walking': 'walk',
            'running': 'run'
        };

        // get active activities
        let activeActivities = [];
        let activeSeed = this.config.forest.persons.count;
        Object.entries(this.config.forest.persons.activities).forEach(([activity, active]) => {
            if (active) {
                activeSeed += activity;
                activeActivities.push(activityMapping[activity]);
            }
        });

        // choose random activity from active activities
        const randomIndex = randomInt(0, activeActivities.length - 1, activeSeed);
        const randomActivity = activeActivities[randomIndex];

        return randomActivity || 'idle';
    }

    activateAction(action) {
        const clip = action.getClip();
        const settings = this.baseActions[clip.name] || this.additiveActions[clip.name];
        this.setWeight(action, settings.weight);
        action.play();
    }

    setWeight(action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }

    setSpeed(speed) {
        this.mixer.timeScale = speed;
    }

    setPosition(position, direction) {
        this.currentPosition = position;
        this.currentDirection = direction;

        // set position
        this.person.position.x = this.currentPosition.x;
        this.person.position.y = this.currentPosition.y;
        this.person.position.z = this.currentPosition.z;

        // set rotation
        const rotation = new THREE.Euler(0, rad(this.currentDirection + 90), 0, 'XYZ');
        this.person.setRotationFromEuler(rotation);
    }

    prepareCrossFade(startAction, endAction, duration) {
        if (this.currentBaseAction === 'idle' || !startAction || !endAction) {
            this.executeCrossFade(startAction, endAction, duration);
        }
        else {
            this.synchronizeCrossFade(startAction, endAction, duration);
        }

        if (endAction) {
            const clip = endAction.getClip();
            this.currentBaseAction = clip.name;
        }
        else {
            this.currentBaseAction = 'idle';
        }
    }

    synchronizeCrossFade(startAction, endAction, duration) {
        const onLoopFinished = (event) => {
            if (event.action === startAction) {
                this.mixer.removeEventListener('loop', onLoopFinished);
                this.executeCrossFade(startAction, endAction, duration);
            }
        }
        this.mixer.addEventListener('loop', onLoopFinished);
    }

    executeCrossFade(startAction, endAction, duration) {
        if (endAction) {
            this.setWeight(endAction, 1);
            endAction.time = 0;

            if (startAction) {
                startAction.crossFadeTo(endAction, duration, true);
            }
            else {
                endAction.fadeIn(duration);
            }
        }
        else {
            startAction.fadeOut(duration);
        }
    }

    async animate() {
        for (let i = 0; i < this.numAnimations; ++i) {
            const action = this.allActions[i];
            const clip = action.getClip();
            const settings = this.baseActions[clip.name] || this.additiveActions[clip.name];
            settings.weight = action.getEffectiveWeight();
        }

        // update person position
        await this.update();

        if (this.active) {
            // next animation
            requestAnimationFrame(this.animate);
        }
        else {
            // reset actions
            this.mixer.stopAllAction();
        }
    }

    async update() {
        const sizeInner = this.config.forest.ground;

        const personMargin = 1;
        const personPositionMin = -sizeInner / 2 + personMargin;
        const personPositionMax = sizeInner / 2 - personMargin;

        // animate action
        this.mixer.update(this.clock.getDelta());

        // trajectory coordinates
        const start = this.currentPosition;
        const end = start.clone().add(new THREE.Vector3(
            Math.cos(rad(this.currentDirection)),
            0,
            -Math.sin(rad(this.currentDirection))
        ));

        const speed = 1.65 * 2;
        const moveDuration = start.distanceTo(end) / speed;

        // calculate time
        if (moveDuration > 0) {
            const trajectoryTime = this.mixer.time / moveDuration;

            const current = this.person.position.clone();
            const trajectory = new THREE.Line3(start, end);
            trajectory.at(trajectoryTime, current);

            // set position
            this.person.position.x = current.x;
            this.person.position.y = current.y;
            this.person.position.z = current.z;

            // boundary detection
            if (this.mixer.time > 0.1) {
                const top = current.z <= personPositionMin;
                const bottom = current.z >= personPositionMax;
                const left = current.x <= personPositionMin;
                const right = current.x >= personPositionMax;

                // check boundary
                const boundaryReached = top ? 'top' : (bottom ? 'bottom' : (left ? 'left' : (right ? 'right' : '')));
                if (boundaryReached) {
                    const oppositeDirections = {
                        'top': randomInt(185, 355, this.currentDirection),
                        'bottom': randomInt(5, 175, this.currentDirection),
                        'left': randomInt(85, -85, this.currentDirection),
                        'right': randomInt(95, 265, this.currentDirection)
                    };

                    // reset time
                    this.mixer.setTime(0.0);

                    // move to opposite direction using a random angle
                    this.setPosition(current, oppositeDirections[boundaryReached]);
                }
            }
        }

        // render
        await this.stage.render();
    }

    async export(zip) {
        // TODO
    }

    async clear() {
        // reset time
        this.mixer.setTime(0.0);

        // set initial position
        this.setPosition(this.position, this.direction);
    }

    async remove() {
        this.scene.remove(this.person);
    }

    async reset() {
        await this.clear();
        await this.update();

        await sleep(100);
    }
};
