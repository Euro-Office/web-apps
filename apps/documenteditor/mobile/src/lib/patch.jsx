import * as Editor from './editor.jsx';

const EditorUIController = () => {
    return null
};

EditorUIController.isSupportEditFeature = () => true;
EditorUIController.getToolbarOptions = Editor.getToolbarOptions;
EditorUIController.getUndoRedo = Editor.getUndoRedo;
EditorUIController.initThemeColors = Editor.initThemeColors;
EditorUIController.initFonts = Editor.initFonts;
EditorUIController.initEditorStyles = Editor.initEditorStyles;
EditorUIController.initFocusObjects = Editor.initFocusObjects;
EditorUIController.initTableTemplates = Editor.initTableTemplates;
EditorUIController.updateChartStyles = Editor.updateChartStyles;
EditorUIController.getEditCommentControllers = Editor.getEditCommentControllers;
// EditorUIController.ContextMenu = Editor.ContextMenu; // Disabled for EE parity

export default EditorUIController;
