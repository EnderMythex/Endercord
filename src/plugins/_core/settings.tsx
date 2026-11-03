/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CloudIcon, FireIcon, MainSettingsIcon, PatchHelperIcon, PluginsIcon, UpdaterIcon } from "@components/Icons";
import {
    AddonsTab,
    PatchHelperTab,
    PerformanceTab,
    SyncTab,
    UpdatesTab,
    VencordTab,
} from "@components/settings";
import { NavIcon, PLUGINS_ROUTE, PluginsNavButton, PluginsPage, setLinkButton } from "@components/settings/PluginsPage";
import { gitHashShort } from "@shared/vencordUserAgent";
import { Devs } from "@utils/constants";
import { isTruthy } from "@utils/guards";
import definePlugin, { IconProps, OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { NavigationRouter, React, SelectedChannelStore } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

const enum LayoutType {
    ROOT = 0,
    SECTION = 1,
    SIDEBAR_ITEM = 2,
    PANEL = 3,
    SPLIT = 4,
    CATEGORY = 5,
    ACCORDION = 6,
    LIST = 7,
    RELATED = 8,
    FIELD_SET = 9,
    TAB_ITEM = 10,
    STATIC = 11,
    BUTTON = 12,
    TOGGLE = 13,
    SLIDER = 14,
    SELECT = 15,
    RADIO = 16,
    NAVIGATOR = 17,
    CUSTOM = 18
}

let LayoutTypes = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    CATEGORY: 5,
    CUSTOM: 19,
};
waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL", "CUSTOM"], v => LayoutTypes = v);

const enum SectionType {
    HEADER = "HEADER",
    DIVIDER = "DIVIDER",
    CUSTOM = "CUSTOM"
}

type SettingsLocation =
    | "top"
    | "aboveNitro"
    | "belowNitro"
    | "aboveActivity"
    | "belowActivity"
    | "bottom";

interface SettingsLayoutNode {
    type: LayoutType;
    key?: string;
    legacySearchKey?: string;
    getLegacySearchKey?(): string;
    useLabel?(): string;
    useTitle?(): string;
    buildLayout?(): SettingsLayoutNode[];
    icon?(): ReactNode;
    render?(): ReactNode;
    StronglyDiscouragedCustomComponent?(): ReactNode;
}

interface EntryOptions {
    key: string;
    title: string;
    panelTitle?: string;
    Component: ComponentType<{}>;
    Icon: ComponentType<IconProps>;
}

interface SettingsLayoutBuilder {
    key?: string;
    buildLayout(): SettingsLayoutNode[];
}

const settings = definePluginSettings({
    settingsLocation: {
        type: OptionType.SELECT,
        description: "Where to put the EnderCord settings section",
        options: [
            { label: "At the very top", value: "top" },
            { label: "Above Billing section", value: "aboveNitro", default: true },
            { label: "Below Billing section", value: "belowNitro" },
            { label: "Above Games & Apps Settings", value: "aboveActivity" },
            { label: "Below Games & Apps Settings", value: "belowActivity" },
            { label: "At the very bottom", value: "bottom" },
        ] as { label: string; value: SettingsLocation; default?: boolean; }[]
    },
    showPluginsButton: {
        type: OptionType.BOOLEAN,
        description: "Show a Plugins button above your DMs, next to Friends and Quests",
        default: true,
        restartNeeded: true
    },
    hibernation: {
        type: OptionType.SELECT,
        description: "Free memory while Discord sits in the background. Never happens during a voice call",
        options: [
            { label: "Off", value: "off", default: true },
            { label: "Light: keeps notifications and calls", value: "light" },
            { label: "Full: frees the most, no notifications until you open Discord", value: "full" },
        ] as { label: string; value: "off" | "light" | "full"; default?: boolean; }[],
        restartNeeded: true
    },
    hibernationDelay: {
        type: OptionType.SLIDER,
        description: "Minutes in the background before hibernating",
        markers: [1, 5, 10, 15, 30, 60],
        default: 10,
        stickToMarkers: true
    },
    customSplash: {
        type: OptionType.BOOLEAN,
        description: "Use the EnderCord theme on Discord's startup screen",
        default: true,
        restartNeeded: true
    },
    optimizeForSize: {
        type: OptionType.BOOLEAN,
        description: "Make Discord's JavaScript engine favor memory over speed",
        default: false,
        restartNeeded: true
    },
    includeVencordInfoWhenCopying: {
        type: OptionType.BOOLEAN,
        description: "Also copy Equicord info (Equicord, Electron, Chromium) when clicking the version info in the bottom left area of the Settings page",
        default: true
    }
});

const PARK_ROUTE = "/channels/@me";
let hibernateTimer: ReturnType<typeof setTimeout> | undefined;
let parkedFrom: string | null = null;

/** Light hibernation: leave the open channel so its images and videos are freed, clear Chromium's image cache and collect garbage. */
function hibernate() {
    if (!document.hidden || SelectedChannelStore.getVoiceChannelId()) return;
    if (settings.store.hibernation === "full") return void VencordNative.native.hibernate();

    if (location.pathname !== PARK_ROUTE) {
        parkedFrom = location.pathname;
        NavigationRouter.transitionTo(PARK_ROUTE);
    }
    VencordNative.native.clearCache();
    (window as Window & { gc?(): void; }).gc?.();
}

function onVisibilityChange() {
    clearTimeout(hibernateTimer);
    hibernateTimer = undefined;

    if (!document.hidden) {
        // Only go back if nothing else, like clicking a notification, already moved you somewhere
        if (parkedFrom && location.pathname === PARK_ROUTE) NavigationRouter.transitionTo(parkedFrom);
        parkedFrom = null;
        return;
    }

    if (settings.store.hibernation !== "off")
        hibernateTimer = setTimeout(hibernate, settings.store.hibernationDelay * 60_000);
}

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    tags: ["Utility"],
    required: true,
    dependencies: ["UserSettingsAPI"],

    settings,

    patches: [
        {
            find: "#{intl::COPY_VERSION}",
            replacement: [
                {
                    match: /\.RELEASE_CHANNEL/,
                    replace: "$&.replace(/^./, c => c.toUpperCase())"
                },
                {
                    match: /"text-xxs\/normal".{0,300}?(?=null!=(\i)&&(.{0,20}\i\.\i.{0,200}?,children:).{0,15}?("span"),{className:(\i\.\i),children:\["Build Override: ",\1\.id,\i\]\}\)\}\))/,
                    replace: (m, _buildOverride, makeRow, component, className) => {
                        return `${m},$self.makeInfoElements(${component},${className}).map(e=>${makeRow}e})),`;
                    }
                },
                {
                    match: /copyValue:\i\.join\(" "\)/g,
                    replace: "$& + $self.getInfoString()"
                }
            ]
        },
        {
            // Plugins page in the main area, next to Quests
            find: '.QUEST_HOME)},"quests")',
            replacement: [
                {
                    // The page itself, right after the Quests route
                    match: /(?<=\(0,(\i\.jsx)\)\((\i\.\i),\{path:\i\.\i\.QUEST_HOME,render:\i,impressionName:\i\.\i\.QUEST_HOME,disableTrack:!0\}\))/,
                    replace: `,(0,$1)($2,{path:"${PLUGINS_ROUTE}",render:$self.renderPluginsPage,disableTrack:!0})`
                },
                {
                    // Keep the page's row highlighted instead of falling back to Friends
                    match: /(?<=let \i=\[)(?=\i\.\i\.FAMILY_CENTER,\i\.\i\.QUEST_HOME,)/,
                    replace: `"${PLUGINS_ROUTE}",`
                },
                {
                    // Grab Discord's row component from the Friends row, to render ours the same way
                    match: /(?<=\(0,\i\.jsx\)\()(\i\.\i)(?=,\{showHoverGradient:\i,onClick:\i,selected:\i,route:\i\.\i\.FRIENDS,)/,
                    replace: "$self.setLinkButton($1)"
                },
                {
                    // Title bar shows "Plugins" like it shows "Quests"
                    match: /(\i)\.pathname\.startsWith\(\i\.\i\.QUEST_HOME\)\?\((\i)=\i\.intl\.string\(\i\.t\.\i\),(\i)=\(0,(\i\.jsx)\)\(\i\.\i,\{size:"sm"\}\)\):/,
                    replace: `$&$1.pathname.startsWith("${PLUGINS_ROUTE}")?($2="Plugins",$3=(0,$4)($self.NavIcon,{size:"sm"})):`
                },
                {
                    // Our row under Quests, also when another plugin hides Quests
                    match: /(?<=\{selected:(\i)\.startsWith\(\i\.\i\.QUEST_HOME\)\},"quests"\)(?:&&undefined)?)(?=[,\]])/,
                    replace: ",$self.renderPluginsButton($1)",
                    predicate: () => settings.store.showPluginsButton
                }
            ]
        },
        {
            // Routes the app shell accepts, otherwise our page redirects home
            find: ".QUEST_HOME_DEPRECATED,",
            all: true,
            replacement: {
                match: /(?<=\i\.\i\.QUEST_HOME_DEPRECATED,\i\.\i\.QUEST_HOME,)(?=\i\.\i\.CONJURE,)/,
                replace: `"${PLUGINS_ROUTE}",`
            }
        },
        {
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    NavIcon,
    setLinkButton,
    start() {
        document.addEventListener("visibilitychange", onVisibilityChange);
    },

    stop() {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        clearTimeout(hibernateTimer);
    },

    renderPluginsButton: (path: string) => <PluginsNavButton key="endercord-plugins" path={path} />,
    renderPluginsPage: () => <PluginsPage />,

    buildEntry(options: EntryOptions): SettingsLayoutNode {
        const { key, title, panelTitle = title, Component, Icon } = options;

        const panel: SettingsLayoutNode = {
            key: key + "_panel",
            type: LayoutTypes.PANEL,
            useTitle: () => panelTitle,
            buildLayout: () => [{
                type: LayoutTypes.CATEGORY,
                key: key + "_category",
                buildLayout: () => [{
                    type: LayoutTypes.CUSTOM,
                    key: key + "_custom",
                    Component: Component,
                    useSearchTerms: () => [title]
                }]
            }]
        };

        return ({
            key,
            type: LayoutTypes.SIDEBAR_ITEM,
            useTitle: () => title,
            icon: () => <Icon width={20} height={20} />,
            buildLayout: () => [panel]
        });
    },

    buildLayout(originalLayoutBuilder: SettingsLayoutBuilder) {
        const layout = originalLayoutBuilder.buildLayout();
        if (originalLayoutBuilder.key !== "$Root") return layout;
        if (!Array.isArray(layout)) return layout;
        if (layout.some(s => s?.key === "equicord_section")) return layout;

        const { buildEntry } = this;

        const equicordEntries: SettingsLayoutNode[] = [
            buildEntry({
                key: "equicord_main",
                title: "EnderCord",
                panelTitle: "EnderCord Settings",
                Component: VencordTab,
                Icon: MainSettingsIcon
            }),
            buildEntry({
                key: "equicord_plugins",
                title: "Plugins & Themes",
                Component: AddonsTab,
                Icon: PluginsIcon
            }),
            buildEntry({
                key: "equicord_updater",
                title: "Updates",
                panelTitle: "EnderCord Updates",
                Component: UpdatesTab,
                Icon: UpdaterIcon
            }),
            buildEntry({
                key: "equicord_performance",
                title: "Performance",
                Component: PerformanceTab,
                Icon: FireIcon
            }),
            buildEntry({
                key: "equicord_cloud",
                title: "Backup & Sync",
                Component: SyncTab,
                Icon: CloudIcon
            }),
            !IS_STANDALONE && PatchHelperTab && buildEntry({
                key: "equicord_patch_helper",
                title: "Patch Helper",
                Component: PatchHelperTab,
                Icon: PatchHelperIcon
            }),
            ...this.customEntries.map(buildEntry)
        ].filter(isTruthy);

        const equicordSection: SettingsLayoutNode = {
            key: "equicord_section",
            type: LayoutTypes.SECTION,
            useTitle: () => "EnderCord Settings",
            buildLayout: () => equicordEntries
        };

        const { settingsLocation } = settings.store;

        const places: Record<SettingsLocation, string> = {
            top: "user_section",
            aboveNitro: "billing_section",
            belowNitro: "billing_section",
            aboveActivity: "games_and_apps_section",
            belowActivity: "games_and_apps_section",
            bottom: "utility_section"
        };

        const key = places[settingsLocation] ?? places.top;
        let idx = layout.findIndex(s => typeof s?.key === "string" && s.key === key);

        if (idx === -1) {
            idx = 2;
        } else if (settingsLocation.startsWith("below")) {
            idx += 1;
        }

        layout.splice(idx, 0, equicordSection);

        return layout;
    },

    customSections: [] as ((SectionTypes: Record<string, string>) => { section: string; element: ComponentType; label: string; id?: string; })[],
    customEntries: [] as EntryOptions[],

    get electronVersion() {
        return VencordNative.native.getVersions().electron ?? window.legcord?.electron ?? null;
    },

    get chromiumVersion() {
        try {
            return (
                VencordNative.native.getVersions().chrome ??
                // @ts-expect-error userAgentData types
                navigator.userAgentData?.brands?.find(
                    (b: { brand: string; }) => b.brand === "Chromium" || b.brand === "Google Chrome",
                )?.version ??
                null
            );
        } catch {
            return null;
        }
    },

    getVersionInfo(support = true) {
        let version = "";

        if (IS_DEV) version = "Dev Build";
        if (IS_WEB) version = "Web";
        if (IS_VESKTOP) version = `Vesktop v${VesktopNative.app.getVersion()}`;
        if (IS_PAWTOP) version = `Pawtop v${VesktopNative.app.getVersion()}`;
        if (IS_STANDALONE) version = "Standalone";

        return support && version ? ` (${version})` : version;
    },

    getInfoRows() {
        const { electronVersion, chromiumVersion, getVersionInfo } = this;

        const rows = [`EnderCord ${gitHashShort}${getVersionInfo()}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        if (!settings.store.includeVencordInfoWhenCopying) return "";
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(Component: ComponentType<PropsWithChildren<{ className?: string; }>>, className: string) {
        return this.getInfoRows().map((text, i) =>
            <Component key={i} className={className}>{text}</Component>
        );
    }
});
