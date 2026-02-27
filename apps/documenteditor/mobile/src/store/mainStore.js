
import {storeDocumentSettings} from './documentSettings.js';
import {storeFocusObjects} from "./focusObjects.js";
import {storeUsers} from '../../../../common/mobile/lib/store/users.js';
import {storeTextSettings} from "./textSettings.js";
import {storeParagraphSettings} from "./paragraphSettings.js";
import {storeShapeSettings} from "./shapeSettings.js";
import {storeImageSettings} from "./imageSettings.js";
import {storeTableSettings} from "./tableSettings.js";
import {storeChartSettings} from "./chartSettings.js";
import {storeDocumentInfo} from "./documentInfo.js";
import {storeLinkSettings} from './linkSettings.js';
import {storeApplicationSettings} from './applicationSettings.js';
import {storeAppOptions} from "./appOptions.js";
import {storeReview} from '../../../../common/mobile/lib/store/review.js';
import {storeComments} from "../../../../common/mobile/lib/store/comments.js";
import {storeToolbarSettings} from "./toolbar.js";
import { storeNavigation } from './navigation.js';
import { storeThemes } from '../../../../common/mobile/lib/store/themes.js';
import { storeVersionHistory } from '../../../../common/mobile/lib/store/versionHistory.js';
import { storePalette } from "./palette.js";

export const stores = {
    storeAppOptions: new storeAppOptions(),
    storeFocusObjects: new storeFocusObjects(),
    storeDocumentSettings: new storeDocumentSettings(),
    users: new storeUsers(),
    storeTextSettings: new storeTextSettings(),
    storeLinkSettings: new storeLinkSettings(),
    storeParagraphSettings: new storeParagraphSettings(),
    storeShapeSettings: new storeShapeSettings(),
    storeChartSettings: new storeChartSettings(),
    storeImageSettings: new storeImageSettings(),
    storeTableSettings: new storeTableSettings(),
    storeDocumentInfo: new storeDocumentInfo(),
    storeApplicationSettings: new storeApplicationSettings(),
    storePalette: new storePalette(),
    storeReview: new storeReview(),
    storeComments: new storeComments(),
    storeToolbarSettings: new storeToolbarSettings(),
    storeNavigation: new storeNavigation(),
    storeThemes: new storeThemes(),
    storeVersionHistory: new storeVersionHistory()
};

