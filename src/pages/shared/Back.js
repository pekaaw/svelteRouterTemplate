let navigatorInstance = undefined;

export const setNavigator = navigator => navigatorInstance = navigator;
export const backClick = () => navigatorInstance && navigatorInstance.back();
