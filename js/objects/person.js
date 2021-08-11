class Person {
    constructor(forest, index) {
        this.root = forest.root;
        this.config = forest.config;
        this.loader = forest.loader;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;
        this.index = index;

        const personMargin = 1;
        const personPositionMin = -this.config.forest.ground / 2 + personMargin;
        const personPositionMax = this.config.forest.ground / 2 - personMargin;

        this.initialPosition = new THREE.Vector3(
            randomFloat(personPositionMin, personPositionMax),
            0,
            randomFloat(personPositionMin, personPositionMax)
        );
        this.initialDirection = randomInt(0, 360, index);
        this.lastPosition = this.initialPosition.clone();
        this.lastDirection = this.initialDirection;

        this.track = [];
        this.actions = [];

        this.currentActivity;
        this.activityMapping = {
            laying: {
                name: 'laying',
                weight: 0.0,
                height: 0.94,
                speed: 0.0
            },
            sitting: {
                name: 'sitting',
                weight: 0.0,
                height: 0.92,
                speed: 0.0
            },
            standing: {
                name: 'standing',
                weight: 0.0,
                height: 0.91,
                speed: 0.0
            },
            waving: {
                name: 'waving',
                weight: 0.0,
                height: 0.91,
                speed: 0.0
            },
            injured: {
                name: 'injured',
                weight: 0.0,
                height: 0.91,
                speed: 1.7
            },
            walking: {
                name: 'walking',
                weight: 0.0,
                height: 0.91,
                speed: 1.8
            },
            running: {
                name: 'running',
                weight: 0.0,
                height: 0.91,
                speed: 3.9
            },
            idle: {
                name: 'idle',
                weight: 0.0,
                height: 0.91,
                speed: 0.0
            }
        };

        this.gender = parseInt(this.index % 2, 10);
        this.offset = [0.0, 0.04][this.gender];

        this.surfaceMaterial = new THREE.MeshStandardMaterial({
            color: this.config.material.color.person,
            roughness: 0.7,
            metalness: 0.7
        });

        this.jointsMaterial = new THREE.MeshStandardMaterial({
            color: shadeColor(this.config.material.color.person, 0.4),
            roughness: 0.7,
            metalness: 0.7
        });

        this.clock = new THREE.Clock();

        this.loaded = new Promise(async function (resolve) {
            const path = ['model/male.glb', 'model/female.glb'][this.gender];
            const gltf = await this.loader.load('gltf', path);

            // init person
            this.person = THREE.SkeletonUtils.clone(gltf.scene);
            this.person.traverse((o) => {
                if (o.isMesh) {
                    const joints = o.name.includes('Joints');
                    o.material = joints ? this.jointsMaterial : this.surfaceMaterial;
                }
            });
            this.person.scale.multiplyScalar(10 / 1000);
            this.setPosition(this.initialPosition, this.initialDirection);
            this.track.push({ position: this.initialPosition, direction: this.initialDirection });

            // init animation mixer
            this.animations = gltf.animations.length;
            this.mixer = new THREE.AnimationMixer(this.person);
            this.setTime(1.0);

            // init actions
            for (let i = 0; i < this.animations; ++i) {
                let clip = gltf.animations[i].clone();
                let name = clip.name;

                // add actions
                if (this.activityMapping[name]) {
                    const action = this.mixer.clipAction(clip);
                    this.activityMapping[name].action = action;
                    this.addAction(action);
                }
            }

            this.setActivity();
            this.addPerson();
            this.update();

            // animations
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);

            resolve(this);
        }.bind(this));
    }

    addPerson() {
        setLayer(this.person, this.stage.layer.persons);
        this.scene.add(this.person);
    }

    addAction(action) {
        const clip = action.getClip();
        const settings = this.activityMapping[clip.name];
        this.setWeight(action, settings.weight);
        this.actions.push(action);
        action.play();
    }

    crossFade(startActivity, endActivity, duration) {
        if (!this.mixer) {
            return;
        }

        const startActivityName = startActivity ? startActivity.name : this.activityMapping['idle'].name;
        const endActivityName = endActivity.name;

        const startAction = this.activityMapping[startActivityName].action;
        const endAction = this.activityMapping[endActivityName].action;

        // reset time
        this.mixer.setTime(0.0);

        // set current position
        this.setPosition(this.person.position.clone(), this.lastDirection);

        // execute cross fade
        if (!startActivity || startActivityName !== endActivityName) {
            this.setWeight(endAction, 1.0);
            endAction.time = 0;
            startAction.crossFadeTo(endAction, startActivity ? duration : 0, true);
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
                activeSeed += `${activity}`;
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
        action.setEffectiveTimeScale(1.0);
        action.setEffectiveWeight(weight);
    }

    setTime(time) {
        this.mixer.timeScale = time;
    }

    setPosition(position, direction) {
        // update last position and direction
        this.lastPosition = position;
        this.lastDirection = direction;

        // set position with offset
        this.person.position.set(
            this.lastPosition.x,
            this.lastPosition.y,
            this.lastPosition.z
        );

        // set direction rotation
        const rotation = new THREE.Euler(0, rad(this.lastDirection + 90), 0);
        this.person.setRotationFromEuler(rotation);
    }

    async animate() {
        for (let i = 0; i < this.animations; ++i) {
            const action = this.actions[i];
            const clip = action.getClip();
            const settings = this.activityMapping[clip.name];
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

        // update height offset based on activity
        const height = (this.currentActivity ? this.currentActivity.height : 0) + this.offset;
        this.person.position.y = height;

        // trajectory coordinates
        const start = this.lastPosition;
        const dir = new THREE.Vector3(Math.cos(rad(this.lastDirection)), 0, -Math.sin(rad(this.lastDirection)));
        const end = start.clone().add(dir);

        // move duration
        const speed = this.currentActivity.speed;
        const moveDuration = speed ? start.distanceTo(end) / speed : 0;
        if (moveDuration <= 0) {
            return;
        }

        // calculate time
        const trajectoryTime = this.mixer.time / moveDuration;

        // calculate trajectory
        const current = new THREE.Vector3();
        const trajectory = new THREE.Line3(start, end);
        trajectory.at(trajectoryTime, current);

        // update person position
        current.y = height;
        this.person.position.set(current.x, current.y, current.z);

        // check boundary 
        if (this.mixer.time > 0.1) {
            const top = current.z <= personPositionMin;
            const bottom = current.z >= personPositionMax;
            const left = current.x <= personPositionMin;
            const right = current.x >= personPositionMax;

            // boundary detection
            const boundaryReached = top ? 'top' : (bottom ? 'bottom' : (left ? 'left' : (right ? 'right' : '')));
            if (boundaryReached) {
                const oppositeDirections = {
                    top: randomInt(185, 355, this.lastDirection),
                    bottom: randomInt(5, 175, this.lastDirection),
                    left: randomInt(85, -85, this.lastDirection),
                    right: randomInt(95, 265, this.lastDirection)
                };

                // reset time
                this.mixer.setTime(0.0);

                // move to opposite direction using a random angle
                this.setPosition(current, oppositeDirections[boundaryReached]);
                this.track.push({ position: current, direction: oppositeDirections[boundaryReached] });
            }
        }
    }

    async clear() {
        if (!this.mixer) {
            return;
        }

        // reset time
        this.mixer.setTime(0.0);

        // set initial position
        this.setPosition(this.initialPosition, this.initialDirection);
        this.track = [{ position: this.initialPosition, direction: this.initialDirection }];
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
