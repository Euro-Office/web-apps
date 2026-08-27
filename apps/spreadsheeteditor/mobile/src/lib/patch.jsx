import * as Editor from './editor';

const EditorUIController = () => null;

EditorUIController.isSupportEditFeature = () => true;

EditorUIController.toolbarOptions = Editor.toolbarOptions;
EditorUIController.initThemeColors = Editor.initThemeColors;
EditorUIController.initCellInfo = Editor.initCellInfo;
EditorUIController.initEditorStyles = Editor.initEditorStyles;
EditorUIController.initFonts = Editor.initFonts;

export default EditorUIController;
