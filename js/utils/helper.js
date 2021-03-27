function createFloatAttribute(array, itemSize) {
    const typedArray = new Float32Array(flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
}

function createIntAttribute(array, itemSize) {
    const typedArray = new Uint16Array(flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
}

function normalizeAttribute(attribute) {
    const v = new THREE.Vector3();
    for (let i = 0; i < attribute.count; i++) {
        v.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
        v.normalize();
        attribute.setXYZ(i, v.x, v.y, v.z);
    }
    return attribute;
}

function flattenArray(input) {
    const result = [];
    for (let i = 0; i < input.length; i++) {
        for (let j = 0; j < input[i].length; j++) {
            result.push(input[i][j]);
        }
    }
    return result;
}

function splitArray(items, chunks) {
    const result = [];
    const length = Math.ceil(items.length / chunks);
    for (let j = 0; j < chunks; j++) {
        result.push([]);
        for (let i = 0; i < length; i++) {
            let v = items[i + j * length];
            if (v == undefined) {
                continue;
            }
            result[j].push(v);
        }
    }
    return result;
}

function doubleClick(callback) {
    let click = false;
    let which = -1;
    let state = 0;

    const reset = () => {
        click = false;
        which = -1;
        state = 0;
    };

    let states = ['pointerdown', 'pointerup', 'pointerdown', 'pointerup'];

    return (e) => {
        if (state === 0) {
            which = e.which;
        }

        if (e.type === states[state] && which === e.which) {
            state = state < 3 ? state + 1 : 0;
        }
        else {
            reset();
        }

        if (states[state] === 'pointerup') {
            if (!click) {
                click = true;
                setTimeout(reset, 300);
            }
            else {
                reset();
                callback(e);
            }
        }
    }
}

function getWorkers() {
    const workers = [];
    for (let i = 0; i < navigator.hardwareConcurrency; i++) {
        workers.push(new Worker('js/utils/worker.js'));
    }
    return workers;
}

function getCenter(mesh) {
    const center = new THREE.Vector3();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(center);
    mesh.localToWorld(center);
    return center;
}

function getPoints(mesh) {
    const points = [];
    const vector = new THREE.Vector3();
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        vector.fromBufferAttribute(position, i);
        mesh.localToWorld(vector);
        points.push(new THREE.Vector3().copy(vector));
    }
    return points;
}

function rayCast(from, to, intersects) {
    const rayVector = new THREE.Vector3();
    rayVector.subVectors(to, from);
    const ray = new THREE.Raycaster(from, rayVector.normalize());
    return Array.isArray(intersects) ? ray.intersectObjects(intersects) : ray.intersectObject(intersects);
}

function interpolate(v0, v1, t) {
    return v0 * (1 - t) + v1 * t;
}

function random(min, max, seed) {
    const rng = seed === void (0) ? Math.random : new Math.seedrandom(seed);
    return Math.floor(rng() * (max - min) + min);
}

function radian(degree) {
    return degree * Math.PI / 180;
}

function log(level) {
    const args = Array.from(arguments);
    switch (level) {
        case 'debug':
            console.debug.apply(console, args);
            break;
        case 'info':
            console.info.apply(console, args);
            break;
        case 'warn':
            console.warn.apply(console, args);
            break;
        case 'error':
            console.error.apply(console, args);
            break;
        default:
            console.log.apply(console, args);
    }
}
