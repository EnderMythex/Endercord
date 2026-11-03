/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings, useSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevs, IS_WINDOWS } from "@utils/constants";
import { Margins } from "@utils/margins";
import { promptToRestart } from "@utils/promptToRestart";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

const root = document.documentElement;

const settings = definePluginSettings({
    opacity: {
        type: OptionType.SLIDER,
        description: "How solid Discord's panels are. Lower shows more of the background",
        markers: [40, 50, 60, 70, 80, 90, 100],
        default: 85,
        stickToMarkers: false,
        onChange: (value: number) => root.style.setProperty("--vc-ender-alpha", String(value / 100))
    },
    showRing: {
        type: OptionType.BOOLEAN,
        description: "Show the EnderCord ring in the background",
        default: true,
        onChange: (value: boolean) => root.classList.toggle("vc-ender-ring", value)
    }
});

const TRANSLUCENT_KEYS: ("windowsMaterial" | "transparent")[] = ["windowsMaterial", "transparent"];

function WindowTranslucency() {
    const { windowsMaterial, transparent } = useSettings(TRANSLUCENT_KEYS);
    const on = IS_WINDOWS ? windowsMaterial === "acrylic" : transparent;

    function toggle() {
        if (IS_WINDOWS) Settings.windowsMaterial = on ? "none" : "acrylic";
        else Settings.transparent = !on;
        promptToRestart("relaunch", { subtitle: "Discord needs to restart to change the window's translucency." });
    }

    return (
        <>
            <Paragraph className={Margins.bottom8}>
                The panels are translucent over EnderCord's dark background. Turn on window translucency to see your desktop through
                Discord too{IS_WINDOWS ? ", with Windows' frosted glass effect" : ""}.
            </Paragraph>
            <Button className={Margins.bottom16} variant={on ? "secondary" : "primary"} onClick={toggle}>
                {on ? "Turn Off Window Translucency" : "Turn On Window Translucency"}
            </Button>
        </>
    );
}

export default definePlugin({
    name: "EnderCordTheme",
    description: "EnderCord's translucent dark theme, with the logo's ring glowing in the background.",
    authors: [EquicordDevs.EnderMythex],
    tags: ["Appearance"],
    enabledByDefault: true,
    settings,
    settingsAboutComponent: () => IS_WEB ? null : <WindowTranslucency />,

    start() {
        root.style.setProperty("--vc-ender-alpha", String(settings.store.opacity / 100));
        root.classList.add("vc-ender-theme");
        root.classList.toggle("vc-ender-ring", settings.store.showRing);
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
        root.classList.remove("vc-ender-theme", "vc-ender-ring");
        root.style.removeProperty("--vc-ender-alpha");
    }
});
