class Person {
    constructor(forest) {
        this.root = forest.root;
        this.config = forest.config;
        this.scene = forest.scene;
        this.stage = forest.stage;
        this.forest = forest;

        const width = 1;
        const height = 2;

        const segments = 4;
        const widthSegments = width * segments;
        const heightSegments = height * segments;

        const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
        planeGeometry.rotateX(-Math.PI / 2).translate(0, 0.10, 0);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: this.config.material.color.person });

        const wireGeometry = new THREE.WireframeGeometry(planeGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: this.config.material.color.person });

        this.wire = new THREE.LineSegments(wireGeometry, wireMaterial);
        this.mesh = new THREE.Mesh(planeGeometry, planeMaterial);
        this.mesh.add(this.wire);


        // ###############################################


        this.currentBaseAction = 'idle';

        this.allActions = [];
        this.baseActions = {
            idle: { weight: 1 },
            walk: { weight: 0 },
            run: { weight: 0 }
        };

        this.additiveActions = {
            sneak_pose: { weight: 0 },
            sad_pose: { weight: 0 },
            agree: { weight: 0 },
            headShake: { weight: 0 }
        };

        this.clock = new THREE.Clock();

        new THREE.GLTFLoader().load('models/person.glb', ((gltf) => {
            this.person = gltf.scene;
            this.person.traverse((object) => {
                if (object.isMesh) {
                    object.castShadow = true;
                }
            });

            this.skeleton = new THREE.SkeletonHelper(this.person);
            this.skeleton.visible = false;
            this.scene.add(this.skeleton);

            this.animations = gltf.animations;
            this.mixer = new THREE.AnimationMixer(this.person);

            this.numAnimations = this.animations.length;
            for (let i = 0; i !== this.numAnimations; ++i) {

                let clip = this.animations[i];

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

            this.animate = this.animate.bind(this);
            this.animate();

            let currentAction = this.baseActions['idle'].action;
            let newAction = this.baseActions[this.getAction()].action;

            this.prepareCrossFade(currentAction, newAction, 0.35)

        }).bind(this));
    }

    addPerson() {
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

    modifyTimeScale(speed) {
        this.mixer.timeScale = speed;
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

    setWeight(action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }

    animate() {
        requestAnimationFrame(this.animate);

        for (let i = 0; i !== this.numAnimations; ++i) {
            const action = this.allActions[i];
            const clip = action.getClip();
            const settings = this.baseActions[clip.name] || this.additiveActions[clip.name];
            settings.weight = action.getEffectiveWeight();
        }

        this.update();
    }

    update() {
        if (this.person) {
            this.mixer.update(this.clock.getDelta());
        }

        // render
        this.stage.render();
    }

    export(zip) {
        // TODO
    }

    clear() {
        // TODO
    }

    reset() {
        this.clear();
        this.update();
    }
}
