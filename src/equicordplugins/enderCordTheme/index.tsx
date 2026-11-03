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

import ring from "./ring.css?managed";
import style from "./style.css?managed";

const settings = definePluginSettings({
    opacity: {
        type: OptionType.SLIDER,
        description: "How solid Discord's panels are. Lower shows more of the background",
        markers: [40, 50, 60, 70, 80, 90, 100],
        default: 85,
        stickToMarkers: false,
        onChange: (value: number) => document.documentElement.style.setProperty("--vc-ender-alpha", String(value / 100))
    },
    showRing: {
        type: OptionType.BOOLEAN,
        description: "Show the EnderCord ring in the background",
        default: true,
        onChange: (value: boolean) => value ? enableStyle(ring) : disableStyle(ring)
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

    // The stylesheets themselves switch the theme on and off. Nothing is put on <html> except the opacity, which has a
    // fallback in the CSS, because Discord rewrites <html> at times and that used to make the theme vanish.
    start() {
        document.documentElement.style.setProperty("--vc-ender-alpha", String(settings.store.opacity / 100));
        // Popout windows share this page's code and copy its styles, so only this document gets marked as the main window
        if (!/^\/(popout|overlay)/.test(location.pathname)) document.getElementById("app-mount")?.setAttribute("data-vc-ender-main", "");
        enableStyle(style);
        if (settings.store.showRing) enableStyle(ring);
    },

    stop() {
        disableStyle(style);
        disableStyle(ring);
        document.getElementById("app-mount")?.removeAttribute("data-vc-ender-main");
        document.documentElement.style.removeProperty("--vc-ender-alpha");
    }
});
