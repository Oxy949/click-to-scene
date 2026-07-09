const MODULE_ID = 'cs-click-to-scene';
const SETTING_ID = {
    ENABLE_SCENES_LIST_JUMP: 'enableScenesListJump',
};

Hooks.once('init', () => {
    if (!game.modules.get('lib-wrapper')?.active) {
        if (game.user?.isGM) ui.notifications.error(game.i18n.localize('CS.CLICK_TO_SCENE.LibWrapperError'));
        return;
    }

    const monksSceneNavigationActive = game.modules.get('monks-scene-navigation')?.active;
    if (monksSceneNavigationActive && game.user?.isGM) {
        ui.notifications.info(game.i18n.localize('CS.CLICK_TO_SCENE.MonksNavigationActive'));
    }

    registerSettings({
        [SETTING_ID.ENABLE_SCENES_LIST_JUMP]: !monksSceneNavigationActive,
    });

    libWrapper.register(
        MODULE_ID,
        'Scene.prototype._onClickDocumentLink',
        function (wrapped, event) {
            const id = event.target?.dataset?.id;
            const scene = game.scenes.get(id);
            if (!scene) return wrapped(event);

            return handleSceneClick(event, scene);
        },
        'MIXED',
    );

    handleScenesListSettingChange(game.settings.get(MODULE_ID, SETTING_ID.ENABLE_SCENES_LIST_JUMP));
});

async function handleSceneClick(event, scene) {
    if (event.ctrlKey || event.metaKey) {
        await game.segue.start(scene);
        return;
    }

    if (event.altKey) {
        return scene.sheet.render(true);
    }

    return scene.view();
}

function handleScenesListSettingChange(enabled) {
    const cbName = 'foundry.applications.sidebar.tabs.SceneDirectory.prototype._onClickEntry';

    if (enabled) {
        const getSceneId = (event) => event.target?.parentElement?.dataset?.entryId;

        libWrapper.register(MODULE_ID, cbName, (wrapped, event) => {
                const scene = game.scenes.get(getSceneId(event));
                if (!scene) return wrapped(event);
                return handleSceneClick(event, scene);
            },
            'MIXED',
        );
    }
}

function registerSettings(options) {
    game.settings.register(MODULE_ID, SETTING_ID.ENABLE_SCENES_LIST_JUMP, {
        name: game.i18n.localize('CS.CLICK_TO_SCENE.SETTINGS.EnableScenesList.Name'),
        hint: game.i18n.localize('CS.CLICK_TO_SCENE.SETTINGS.EnableScenesList.Hint'),
        scope: 'world',
        config: true,
        requiresReload: true,
        type: Boolean,
        default: options[SETTING_ID.ENABLE_SCENES_LIST_JUMP],
    });
}

