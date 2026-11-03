/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeTabbedTab } from "@components/settings/tabs/BaseTab";

import BackupAndRestoreTab from "./BackupAndRestoreTab";
import CloudTab from "./CloudTab";

export default makeTabbedTab("Backup & Sync", [
    { id: "cloud", label: "Cloud", Component: () => <CloudTab /> },
    { id: "backup", label: "Backup & Restore", Component: () => <BackupAndRestoreTab /> },
]);
