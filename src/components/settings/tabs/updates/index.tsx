/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeTabbedTab, SubTab } from "@components/settings/tabs/BaseTab";
import ChangelogTab from "@components/settings/tabs/changelog";
import UpdaterTab from "@components/settings/tabs/updater";
import { isTruthy } from "@utils/guards";

export default makeTabbedTab("Updates", [
    !IS_UPDATER_DISABLED && { id: "updater", label: "Updater", Component: () => UpdaterTab && <UpdaterTab /> },
    { id: "changelog", label: "Changelog", Component: () => <ChangelogTab /> },
].filter(isTruthy) satisfies SubTab[]);
