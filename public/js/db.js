// Program management
let programs = {
    default: {
        name: 'Default',
        effects: [
            {
                state: 'on',
                brightness: 75,
                duration: 50
            },
            {
                state: 'off',
                brightness: 0,
                duration: 50
            }
        ]
    }
};

let connections = {
    users: 0,
    flashlights: 0
};

let modes = ['music', 'dj', 'strobe', 'pixel map'];

let songs = [
    {
        name: 'Suspense',
        file: 'suspense_lighting_cues.json',
        wav: 'suspense.wav'
    }
];

export { programs, connections, modes, songs };