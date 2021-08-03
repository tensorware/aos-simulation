const configs = [
    'demo',
    'forest-01',
    'forest-02',
    'forest-03',
    'forest-04',
    'forest-05',
    'forest-06',
    'forest-12',
    'forest-13',
    'forest-14',
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

    return JSON.parse(localStorage.getItem(getLocalStorageKey('gui'))).preset;
};

const getPreset = async (configs) => {

    // load preset from url
    const hash = getHash();
    if (hash.preset) {
        return hash.preset;
    }

    // load preset from local storage
    const load = JSON.parse(localStorage.getItem(getLocalStorageKey('gui')) || '{}');
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
            config.preset = preset;

            // set config from hash parameters
            setConfig(config, getHash());

            // update material color format
            for (key in config.material.color) {
                config.material.color[key] = parseInt(config.material.color[key], 16);
            }

            // resolve promise
            resolve(config);
        }).catch(async () => {
            // resolve promise using default config
            return resolve(await getConfig('demo'));
        });
    });
};

const setConfig = async (config, objects) => {
    for (const key in objects) {
        if (key != 'preset') {
            const value = !isNaN(objects[key]) ? Number(objects[key]) : objects[key];
            setProperty(config, key.split('.'), value);
        }
    }
};
