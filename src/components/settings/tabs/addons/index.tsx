/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeTabbedTab, SubTab } from "@components/settings/tabs/BaseTab";
import PluginsTab from "@components/settings/tabs/plugins";
import ThemesTab from "@components/settings/tabs/themes";
import UserPluginsTab from "@components/settings/tabs/userPlugins";

export const addonTabs: SubTab[] = [
    { id: "plugins", label: "Plugins", Component: () => <PluginsTab /> },
    ...(IS_WEB ? [] : [{ id: "mine", label: "My Plugins", Component: () => <UserPluginsTab /> }]),
    { id: "themes", label: "Themes", Component: () => <ThemesTab /> },
];

export default makeTabbedTab("Plugins & Themes", addonTabs);
