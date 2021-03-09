function createFloatAttribute(array, itemSize) {
    const typedArray = new Float32Array(Tree.flattenArray(array));
    return new THREE.BufferAttribute(typedArray, itemSize);
}

function createIntAttribute(array, itemSize) {
    const typedArray = new Uint16Array(Tree.flattenArray(array));
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

function doubletap(callback) {
    let timer = 0;
    return (e) => {
        if (timer == 0) {
            timer = 1;
            timer = setTimeout(() => { timer = 0 }, 400);
        }
        else {
            timer = 0;
            callback(e);
        }
    }
}

function ray(from, to, intersects) {
    const rayVector = new THREE.Vector3();
    rayVector.subVectors(to, from);
    const ray = new THREE.Raycaster(from, rayVector.normalize());
    return Array.isArray(intersects) ? ray.intersectObjects(intersects) : ray.intersectObject(intersects);
}

function isValid() {
    Array.from(arguments).forEach((arg) => {
        if (typeof arg === 'undefined') {
            return false;
        }
    });
    return true;
}

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
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
