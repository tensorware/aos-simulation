const configs = [
    'demo',
    'forest-21',
    'forest-22',
    'forest-23',
    'forest-31',
    'forest-32',
    'forest-33',
    'forest-41',
    'forest-42',
    'forest-43'
];

const loadPreset = async (configs) => {
    // load preset from json
    const presets = (configRoot, config, guiRoot, gui) => {
        for (let key in config) {
            if (!config.hasOwnProperty(key)) {
                continue;
            }

            if (typeof config[key] == 'object') {
                // get config subfolder
                presets(configRoot, config[key], guiRoot, gui.addFolder(key));
            }
            else {
                // get config parent keys
                let guiParent = gui;
                let configParents = [];
                while (guiParent.parent) {
                    configParents.unshift(guiParent.name);
                    guiParent = guiParent.parent;
                }

                // set config target
                let configTarget = configRoot;
                let configSource = clone(configRoot);
                configParents.forEach((key) => {
                    configTarget = configTarget[key];
                    configSource = configSource[key];
                });

                // add config properties
                if (configParents.includes('color')) {
                    gui.addColor(configTarget, key);
                }
                else {
                    gui.add(configTarget, key);
                }

                // remember config value
                Object.assign(configTarget, configSource);
                guiRoot.remember(configTarget);
            }
        }
    };

    await Promise.all([...configs].reverse().map(getConfig)).then((configsReversed) => {
        configsReversed.forEach((config) => {
            const gui = new dat.GUI({ autoPlace: false });
            gui.useLocalStorage = true;

            // generate and save preset
            presets(config, config, gui, gui);
            gui.saveAs(config.preset);
            gui.destroy();
        });
    });

    return jsonParse(localStorage.getItem(getLocalStorageKey('gui'))).preset;
};

const getPreset = async (configs) => {
    // load preset from url
    const hash = getHash();
    if (hash.preset) {
        return hash.preset;
    }

    // load preset from local storage
    const load = jsonParse(localStorage.getItem(getLocalStorageKey('gui')) || '{}');
    if (load.preset) {
        return load.preset;
    }

    // load preset from json
    return loadPreset(configs);
};

const getConfig = async (preset) => {
    return new Promise((resolve) => {
        // load json config file
        fetch(`config/${preset}.json`).then((response) => {
            return response.json();
        }).then((config) => {
            // set config from hash
            const hash = getHash();
            setConfig(config, hash);
            config.preset = preset

            // resolve promise
            resolve(config);
        }).catch(async () => {
            // resolve promise using default config
            return resolve(await getConfig('demo'));
        });
    });
};

const setConfig = async (config, objects) => {
    const next = jsonParse(objects.next) || 0;

    // update config values  
    for (const key in objects) {
        if (key != 'preset') {
            let value = jsonParse(objects[key]);
            if (getType(value) === 'array') {
                const idx = clamp(next, 0, value.length - 1);
                value = value[idx];
            }
            setProperty(config, key.split('.'), value);
        }
    }

    // update material color values
    for (key in config.material.color) {
        const value = config.material.color[key];
        config.material.color[key] = parseInt(value, 16);
    }
};

const getHash = (key) => {
    const query = new URL(window.location.href.replace(/#/g, '?'));
    const params = Object.fromEntries(query.searchParams);
    return key ? params[key] : params;
};

const getLocalStorageKey = (key) => {
    return `${document.location.href}.${key}`;
};