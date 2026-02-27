
import {storeAppOptions} from './appOptions.js';
// import {storeDocumentSettings} from './documentSettings';
import {storeFocusObjects} from "./focusObjects.js";
import {storeUsers} from '../../../../common/mobile/lib/store/users.js';
import {storeApplicationSettings} from './applicationSettings.js';
import {storePresentationInfo} from './presentationInfo.js';
import {storePresentationSettings} from './presentationSettings.js';
import { storePalette } from './palette.js';
import { storeSlideSettings } from './slideSettings.js';
import { storeTextSettings } from './textSettings.js';
import { storeShapeSettings } from './shapeSettings.js';
import { storeTableSettings } from "./tableSettings.js";
import { storeChartSettings } from "./chartSettings.js";
import { storeLinkSettings } from "./linkSettings.js";
// import {storeParagraphSettings} from "./paragraphSettings";
// import {storeShapeSettings} from "./shapeSettings.js";
// import {storeImageSettings} from "./imageSettings";
import {storeReview} from '../../../../common/mobile/lib/store/review.js';
import {storeComments} from "../../../../common/mobile/lib/store/comments.js";
import {storeToolbarSettings} from "./toolbar.js";
import { storeThemes } from '../../../../common/mobile/lib/store/themes.js';
import { storeVersionHistory } from '../../../../common/mobile/lib/store/versionHistory.js';

export const stores = {
    storeAppOptions: new storeAppOptions(),
    storeFocusObjects: new storeFocusObjects(),
    // storeDocumentSettings: new storeDocumentSettings(),
    users: new storeUsers(),
    storeApplicationSettings: new storeApplicationSettings(),
    storePresentationInfo: new storePresentationInfo(),
    storePresentationSettings: new storePresentationSettings(),
    storeSlideSettings: new storeSlideSettings(),
    storePalette: new storePalette(),
    storeTextSettings: new storeTextSettings(),
    storeShapeSettings: new storeShapeSettings(),
    storeTableSettings: new storeTableSettings(),
    storeChartSettings: new storeChartSettings(),
    storeLinkSettings: new storeLinkSettings(),
    storeReview: new storeReview(),
    // storeTextSettings: new storeTextSettings(),
    // storeParagraphSettings: new storeParagraphSettings(),
    // storeShapeSettings: new storeShapeSettings(),
    // storeChartSettings: new storeChartSettings(),
    storeComments: new storeComments(),
    storeToolbarSettings: new storeToolbarSettings(),
    storeThemes: new storeThemes(),
    storeVersionHistory: new storeVersionHistory()
};

