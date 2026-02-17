
import {storeAppOptions} from './appOptions.js';
import {storeUsers} from '../../../../common/mobile/lib/store/users.js';
import {storeApplicationSettings} from './applicationSettings.js';
import {storeVisioInfo} from './visioInfo.js';
import {storeToolbarSettings} from "./toolbar.js";
import { storeThemes } from '../../../../common/mobile/lib/store/themes.js';

export const stores = {
    storeAppOptions: new storeAppOptions(),
    users: new storeUsers(),
    storeApplicationSettings: new storeApplicationSettings(),
    storeVisioInfo: new storeVisioInfo(),
    storeToolbarSettings: new storeToolbarSettings(),
    storeThemes: new storeThemes()
};

