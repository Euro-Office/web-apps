import {storeFocusObjects} from "./focusObjects.js";
import {storeUsers} from '../../../../common/mobile/lib/store/users.js';
import {storeFunctions} from './functions.js';
import {storePalette} from "./palette.js";
import {storeTextSettings} from "./textSettings.js";
import {storeApplicationSettings} from "./applicationSettings.js";
import {storeShapeSettings} from "./shapeSettings.js";
import {storeCellSettings} from "./cellSettings.js";
import {storeSpreadsheetInfo} from "./spreadsheetInfo.js";
import {storeAppOptions} from "./appOptions.js";
// import {storeImageSettings} from "./imageSettings";
// import {storeTableSettings} from "./tableSettings";
import {storeChartSettings} from "./chartSettings.js";
import {storeSpreadsheetSettings} from "./spreadsheetSettings.js";
import {storeReview} from '../../../../common/mobile/lib/store/review.js';
import {storeComments} from "../../../../common/mobile/lib/store/comments.js";
import {storeToolbarSettings} from "./toolbar.js";
import { storeThemes } from '../../../../common/mobile/lib/store/themes.js';
import { storeVersionHistory } from "../../../../common/mobile/lib/store/versionHistory.js";
import {storeWorksheets} from "./sheets.js";

export const stores = {
    storeFocusObjects: new storeFocusObjects(),
    storeSpreadsheetSettings: new storeSpreadsheetSettings(),
    storeApplicationSettings: new storeApplicationSettings(),
    users: new storeUsers(),
    storeFunctions: new storeFunctions(),
    storeTextSettings: new storeTextSettings(),
    storeSpreadsheetInfo: new storeSpreadsheetInfo(),
    storeAppOptions: new storeAppOptions(),
    // storeParagraphSettings: new storeParagraphSettings(),
    storeShapeSettings: new storeShapeSettings(),
    storeChartSettings: new storeChartSettings(),
    storePalette: new storePalette(),
    storeCellSettings: new storeCellSettings(),
    storeReview: new storeReview(),
    // storeImageSettings: new storeImageSettings(),
    // storeTableSettings: new storeTableSettings()
    storeComments: new storeComments(),
    storeVersionHistory: new storeVersionHistory(),
    storeToolbarSettings: new storeToolbarSettings(),
    storeWorksheets: new storeWorksheets(),
    storeThemes: new storeThemes()
};

