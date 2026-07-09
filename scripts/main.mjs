const MODULE_ID = 'cs-click-to-scene';
const GINZZZU_PORTRAITS_MODULE_ID = 'ginzzzu-portraits';
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

    libWrapper.register(
        MODULE_ID,
        'Actor.prototype._onClickDocumentLink',
        async function (wrapped, event) {
            if (!event.shiftKey || !canToggleGinzzzuPortraits()) return wrapped(event);

            const actor = await getActorFromDocumentLink(event);
            if (!actor) return wrapped(event);

            event.preventDefault();
            event.stopPropagation();

            await globalThis.GinzzzuPortraits.togglePortrait(actor);
            globalThis.GinzzzuNPCDock?.rebuildMini?.();
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

function canToggleGinzzzuPortraits() {
    return game.user?.isGM
        && game.modules.get(GINZZZU_PORTRAITS_MODULE_ID)?.active
        && typeof globalThis.GinzzzuPortraits?.togglePortrait === 'function';
}

async function getActorFromDocumentLink(event) {
    const link = getDocumentLinkElement(event);
    const uuid = link?.dataset?.uuid;
    const id = link?.dataset?.id;

    if (uuid) {
        const document = await fromUuid(uuid).catch(() => null);
        const actor = getActorFromDocument(document);
        if (actor) return actor;
    }

    return id ? game.actors.get(id) : null;
}

function getDocumentLinkElement(event) {
    const target = event.target;
    if (!target) return null;

    return target.closest?.('[data-uuid], [data-id]') ?? target;
}

function getActorFromDocument(document) {
    if (!document) return null;
    if (document.documentName === 'Actor') return document;
    if (document.constructor?.documentName === 'Actor') return document;
    return document.actor ?? null;
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

