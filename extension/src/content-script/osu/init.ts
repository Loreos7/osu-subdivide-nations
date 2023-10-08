import { cleanInvalidatedCacheConditionally } from "@src/utils/cache";
import { setFlagClass } from "@src/content-script/osu/flagHtml";
import { refreshOverlays, exec } from "./content";
import { updateRegionsDropdown } from "./ranking";


export const initConfigure = (flagClass: string)  => {
    cleanInvalidatedCacheConditionally();
    
    setFlagClass(flagClass);
    
chrome.runtime.onMessage.addListener(async (obj, sender, respone) => {


  const {  action } = obj;
  if (action && action === "osu_flag_refresh") {
    await updateRegionsDropdown();
    refreshOverlays();
    exec();
  }
});
}