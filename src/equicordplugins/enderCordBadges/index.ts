/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgePosition } from "@api/Badges";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";

// Shared with EnderCord Mobile, so a badge added there shows up on both
const BADGES_URL = "https://raw.githubusercontent.com/EnderMythex/EndercordMobile/main/badges/badges.json";

interface EnderBadge {
    label: string;
    url: string;
}

const logger = new Logger("EnderCordBadges");
let badges: Record<string, EnderBadge[]> = {};
let controller: AbortController | undefined;

export default definePlugin({
    name: "EnderCordBadges",
    description: "Shows EnderCord badges on profiles, the same ones as on EnderCord Mobile.",
    authors: [EquicordDevs.EnderMythex],
    enabledByDefault: true,

    userProfileBadge: {
        id: "endercord",
        position: BadgePosition.START,
        getBadges: ({ userId }) => (badges[userId] ?? []).map(badge => ({
            id: "endercord",
            description: badge.label,
            iconSrc: badge.url,
            props: { style: { borderRadius: "50%" } }
        }))
    },

    start() {
        controller = new AbortController();
        fetch(BADGES_URL, { signal: controller.signal, cache: "no-store" })
            .then(r => r.json())
            .then(data => { badges = data; })
            .catch(e => logger.error("Failed to load badges", e));
    },

    stop() {
        controller?.abort();
        badges = {};
    }
});
