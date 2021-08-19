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
                let configSource = cloneObject(configRoot);
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

    return jsonParse(localStorage.getItem(localStorageKey('gui'))).preset;
};

const getPreset = async (configs) => {
    // load preset from url
    const hash = getHash();
    if (hash.preset) {
        return hash.preset;
    }

    // load preset from local storage
    const load = jsonParse(localStorage.getItem(localStorageKey('gui')) || '{}');
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
        }).then(async (config) => {
            // set config from hash
            const hash = getHash();
            await setConfig(config, hash);
            config.preset = preset;

            // resolve promise
            resolve(config);
        }).catch(async () => {
            // resolve promise using default config
            return resolve(await getConfig('demo'));
        });
    });
};

const setConfig = async (config, objects) => {
    // previous config
    const prevConfig = cloneObject(config);
    delete prevConfig.next;

    // update config values
    const next = jsonParse(objects.next) || 0;
    for (const key in objects) {
        if (key != 'preset') {
            let value = jsonParse(objects[key]);

            // array values based on next index
            if (getType(value) === 'array') {
                const idx = clamp(next, 0, value.length - 1);
                value = value[idx];
            }

            // update config value
            setProperty(config, key.split('.'), value);
        }
    }

    // update material color values
    for (key in config.material.color) {
        const value = config.material.color[key];
        if (getType(value) === 'string') {
            config.material.color[key] = parseInt(value, 16);
        }
    }

    // next config
    const nextConfig = cloneObject(config);
    delete nextConfig.next;

    return !objectEquals(prevConfig, nextConfig);
};

const getHash = (key) => {
    const url = new URL(window.location.href.replace(/#/g, '&').replace('&', '?'));
    const params = Object.fromEntries(url.searchParams);
    return key ? params[key] : params;
};

const setHash = (key, value) => {
    const hash = getHash();
    hash[key] = value;
    window.location.hash = Object.keys(hash).map((key) => `${key}=${hash[key]}`).join('&');
};

const localStorageKey = (key) => {
    return `${document.location.href}.${key}`;
};