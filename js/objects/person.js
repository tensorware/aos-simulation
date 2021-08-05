class Person {
    constructor(forest, index) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;
        this.index = index;

        const personMargin = 1;
        const personPositionMin = -this.config.forest.ground / 2 + personMargin;
        const personPositionMax = this.config.forest.ground / 2 - personMargin;

        this.initialPosition = new THREE.Vector3(
            randomFloat(personPositionMin, personPositionMax),
            0.02,
            randomFloat(personPositionMin, personPositionMax)
        );
        this.initialDirection = randomInt(0, 360, index);

        this.lastPosition = this.initialPosition.clone();
        this.lastDirection = this.initialDirection;

        this.allActions = [];
        this.baseActions = {
            idle: {
                weight: 1
            },
            walk: {
                weight: 0
            },
            run: {
                weight: 0
            }
        };
        this.poseActions = {
            sneak_pose: {
                weight: 0
            },
            sad_pose: {
                weight: 0
            },
            agree: {
                weight: 0
            },
            headShake: {
                weight: 0
            }
        };

        this.currentActivity;
        this.activityMapping = {
            'idle': {
                name: 'idle',
                speed: 0.0
            },
            'laying': {
                name: 'idle', // TODO
                speed: 0.0
            },
            'sitting': {
                name: 'idle', // TODO
                speed: 0.0
            },
            'standing': {
                name: 'idle', // TODO
                speed: 0.0
            },
            'waving': {
                name: 'idle', // TODO
                speed: 0.0
            },
            'injured': {
                name: 'idle', // TODO
                speed: 0.0
            },
            'walking': {
                name: 'walk',
                speed: 1.63
            },
            'running': {
                name: 'run',
                speed: 3.63
            }
        };

        this.clock = new THREE.Clock();

        this.loaded = new Promise(function (resolve) {
            new THREE.GLTFLoader().load('models/person.glb', ((gltf) => {
                this.person = gltf.scene;
                this.setPosition(this.initialPosition, this.initialDirection);

                // init animation mixer
                this.animations = gltf.animations.length;
                this.mixer = new THREE.AnimationMixer(this.person);

                // init actions
                for (let i = 0; i < this.animations; ++i) {
                    let clip = gltf.animations[i];
                    let name = clip.name;

                    if (this.baseActions[name]) {
                        // add base action
                        const action = this.mixer.clipAction(clip);
                        this.addAction(action);
                        this.baseActions[name].action = action;
                    }
                    else if (this.poseActions[name]) {
                        // additive clip
                        THREE.AnimationUtils.makeClipAdditive(clip);
                        if (clip.name.endsWith('_pose')) {
                            clip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);
                        }

                        // add pose action
                        const action = this.mixer.clipAction(clip);
                        this.addAction(action);
                        this.poseActions[name].action = action;
                    }
                }

                this.setActivity();
                this.addPerson();
                this.update();

                this.animate = this.animate.bind(this);
                requestAnimationFrame(this.animate);

                resolve(this);
            }).bind(this));
        }.bind(this));
    }

    addPerson() {
        this.scene.add(this.person);
    }

    addAction(action) {
        const clip = action.getClip();
        const settings = this.baseActions[clip.name] || this.poseActions[clip.name];
        this.setWeight(action, settings.weight);
        this.allActions.push(action);
        action.play();
    }

    crossFade(startActivity, endActivity, duration) {
        const startActivityName = startActivity ? startActivity.name : this.activityMapping['idle'].name;
        const endActivityName = endActivity.name;

        const startAction = this.baseActions[startActivityName].action;
        const endAction = this.baseActions[endActivityName].action;

        // reset time
        this.mixer.setTime(0.0);

        // set current position
        this.setPosition(this.person.position.clone(), this.lastDirection);

        // execute cross fade
        if (!startActivity || startActivityName !== endActivityName) {
            this.setWeight(endAction, 1);
            endAction.time = 0;
            startAction.crossFadeTo(endAction, duration, true);
        }

        // set current activity
        this.currentActivity = endActivity;
    }

    getActivity() {
        let activeSeed = `${this.index}`;

        // get active activities
        let activeActivities = [];
        Object.entries(this.config.forest.persons.activities).forEach(([activity, active]) => {
            if (active) {
                activeSeed += `-${activity}`;
                activeActivities.push(this.activityMapping[activity]);
            }
        });

        // choose random activity from active activities
        const randomIndex = randomInt(0, activeActivities.length - 1, activeSeed);
        const randomActivity = activeActivities[randomIndex];

        return randomActivity || this.activityMapping['idle'];
    }

    setActivity() {
        this.crossFade(this.currentActivity, this.getActivity(), 0.2);
    }

    setWeight(action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }

    setTime(time) {
        this.mixer.timeScale = time;
    }

    setPosition(position, direction) {
        this.lastPosition = position;
        this.lastDirection = direction;

        // set position
        this.person.position.x = this.lastPosition.x;
        this.person.position.y = this.lastPosition.y;
        this.person.position.z = this.lastPosition.z;

        // set rotation
        const rotation = new THREE.Euler(0, rad(this.lastDirection + 90), 0);
        this.person.setRotationFromEuler(rotation);
    }

    async animate() {
        for (let i = 0; i < this.animations; ++i) {
            const action = this.allActions[i];
            const clip = action.getClip();
            const settings = this.baseActions[clip.name] || this.poseActions[clip.name];
            settings.weight = action.getEffectiveWeight();
        }

        // update person position
        await this.update();

        // next animation
        requestAnimationFrame(this.animate);
    }

    async update() {
        // ground position constraints
        const personMargin = 1;
        const personPositionMin = -this.config.forest.ground / 2 + personMargin;
        const personPositionMax = this.config.forest.ground / 2 - personMargin;

        // update action mixer time
        this.mixer.update(this.clock.getDelta());

        // trajectory coordinates
        const start = this.lastPosition;
        const end = start.clone().add(new THREE.Vector3(
            Math.cos(rad(this.lastDirection)),
            0,
            -Math.sin(rad(this.lastDirection))
        ));

        // move duration
        const speed = this.currentActivity.speed;
        const moveDuration = speed ? start.distanceTo(end) / speed : 0;

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
                        'top': randomInt(185, 355, this.lastDirection),
                        'bottom': randomInt(5, 175, this.lastDirection),
                        'left': randomInt(85, -85, this.lastDirection),
                        'right': randomInt(95, 265, this.lastDirection)
                    };

                    // reset time
                    this.mixer.setTime(0.0);

                    // move to opposite direction using a random angle
                    this.setPosition(current, oppositeDirections[boundaryReached]);
                }
            }
        }
    }

    async export(zip) {
        // TODO export json
    }

    async clear() {
        if (this.mixer) {
            // reset time
            this.mixer.setTime(0.0);

            // set initial position
            this.setPosition(this.initialPosition, this.initialDirection);
        }
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
