import { flagClass, addFlagUser, addRegionalFlag } from "@src/content-script/osu/flagHtml";
import { countryRegionsLocalData, getRegionNames } from "@src/utils/flagsJsonUtils";
import { osuWorldCountryRegionRanking, IosuWorldRegionalPlayerData, buildProfileUrl } from "@src/utils/osuWorld";
import { addOrReplaceQueryParam, removeQueryParam, convertToGroupsOf5 } from "@src/utils/utils";
import { nextFunctionId, runningId } from "./content";
import { getLocMsg } from "@src/utils/languagesChrome";

// https://osu.ppy.sh/rankings/fruits/performance?country=ES&region=ES-AN
const rankingIdAttr = "data-user-id";

export const updateFlagsRankings = async () => {
  const url = location.href;
if(
  !url.includes("osu.ppy.sh/rankings") &&
  !url.includes("osu.ppy.sh/multiplayer/rooms") &&
  !url.includes("osu.ppy.sh/rankings/kudosu")
  || url.includes("/country")
) return;

    const listItems = document.querySelectorAll(".ranking-page-table>tbody>tr");
  
  
    if (url.includes("/country")) {
      return;
    }
  
    if (
      url.includes("osu.ppy.sh/multiplayer/rooms") ||
      url.includes("osu.ppy.sh/rankings/kudosu") ||
      (url.includes("osu.ppy.sh/rankings") && url.includes("charts"))
    ) {
      for (const item of listItems) {
        addLinkToFlag(item as HTMLElement);
      }
    }
    const functionId = nextFunctionId();
  
  
    const isRegionRanking = await regionsInRanking(functionId);
    if(isRegionRanking) return;
  
  
    for (const item of listItems) {
      if (functionId != runningId) {
        return;
      }
      let idItem = item.querySelector(`[${rankingIdAttr}]`)!;
      const userId = idItem.getAttribute(rankingIdAttr)!;
  
      await addFlagUser(item as HTMLElement, userId, true, true );
    }
  };

const addLinkToFlag = (item: HTMLElement) => {
  const flags = item.querySelectorAll(`.${flagClass}`);

  if (!flags || flags.length != 1) {
    return;
  }

  const anchorParent = document.createElement("div");
  const parent = flags[0].parentElement!;
  anchorParent.appendChild(flags[0]);
  parent.insertBefore(anchorParent, parent.firstChild);
};



const regionsInRanking = async (functionId: number) : Promise<boolean> => {
  const queryString = location.search;
  const urlParams = new URLSearchParams(queryString);
  const regionUrlParam = urlParams.get("region");
  const countryUrlParam = urlParams.get("country");


  const rankingType = location.pathname.split("/")[3];
  const filter = urlParams.get("filter");
  
  if (rankingType === "performance" &&
      (!filter || filter === "all") 
      && countryUrlParam) {
    addRegionsDropdown(countryUrlParam, regionUrlParam);
    if(!regionUrlParam) return false;
    const regionData =
    (await countryRegionsLocalData)[countryUrlParam]?.["regions"]?.[regionUrlParam];
    if (regionData) {
      const page = urlParams.get("page");
      const mode = location.pathname.split("/")[2];
      await regionalRanking(
        functionId,
        mode,
        countryUrlParam,
        regionUrlParam,
        page != null ? parseInt(page) : 1
      );
      return true;
    }
  }
  return false;
}

  export const updateRegionsDropdown = async () => {
  const addedDropdown = document.querySelector("#cavitedev_region_dropdown");
  if (!addedDropdown) return;

  const queryString = location.search;
  const urlParams = new URLSearchParams(queryString);
  const regionUrlParam = urlParams.get("region");
  const countryUrlParam = urlParams.get("country");

  addedDropdown.remove();
  if(!countryUrlParam || !regionUrlParam) return;
  addRegionsDropdown(countryUrlParam, regionUrlParam);
};

 const addRegionsDropdown = async (countryCode: string, regionCode: string | null) => {
  const addedDropdown = document.querySelector("#cavitedev_region_dropdown");
  let regionNames = await getRegionNames(countryCode);
  const regionNamesKeys = Object.entries(regionNames).sort(
    ([key1, value1], [key2, value2]) => value1.localeCompare(value2)
  );

  regionNames = Object.fromEntries(regionNamesKeys);

  // remove dropdown if country isn't supported by osu!world
  if (!Object.keys(regionNames).length) {
    if (addedDropdown) {
      addedDropdown.remove();
    }

    return;
  }

  if (addedDropdown) {
    return;
  }

  const originalDropdown = document.querySelector(".ranking-filter--full");
  // May not be loaded yet
  if (!originalDropdown) return;
  const cloneDropdown = originalDropdown.cloneNode(true) as HTMLElement;

  cloneDropdown.setAttribute("id", "cavitedev_region_dropdown");
  cloneDropdown.querySelector(".ranking-filter__title")!.textContent =
    getLocMsg(`region_${countryCode.toLowerCase()}`, ["region"]);

  const predefinedAnchor = cloneDropdown.querySelector(
    ".select-options__select .select-options__option"
  )!;
  const selectDiv = cloneDropdown.querySelector(".select-options")!;

  predefinedAnchor.addEventListener("click", function (event) {
    event.preventDefault();
    selectDiv.classList.toggle("select-options--selecting");
  });

  // Options
  const optionsParent = cloneDropdown.querySelector(
    ".select-options__selector"
  )!;
  const templateOption = optionsParent!.firstChild!.cloneNode(true) as HTMLElement;

  while (optionsParent!.firstChild) {
    optionsParent!.removeChild(optionsParent!.firstChild);
  }

  // All
  const baseRanking = addOrReplaceQueryParam(
    templateOption.getAttribute("href")!,
    "country",
    countryCode
  );

  const allLink = removeQueryParam(baseRanking, "region");
  templateOption.setAttribute("href", allLink);

  const allText = templateOption.textContent;

  const allOption = templateOption.cloneNode(true);
  optionsParent.appendChild(allOption);

  for (const key in regionNames) {
    const value = regionNames[key];
    const updatedRanking = addOrReplaceQueryParam(
      baseRanking,
      "region",
      key
    );
    const clonedOption = templateOption.cloneNode(true) as HTMLElement;
    clonedOption.setAttribute("href", updatedRanking);
    clonedOption.textContent = value;
    optionsParent.appendChild(clonedOption);
  }

  const selectedRegionName = regionCode != null ? regionNames[regionCode] ?? allText : allText;
  cloneDropdown.querySelector(
    ".select-options__select .u-ellipsis-overflow"
  )!.textContent = selectedRegionName;

  if (document.querySelector("#cavitedev_region_dropdown")) return;

  originalDropdown.parentElement!.appendChild(cloneDropdown);
};

 const regionalRanking = async (
  functionId: number,
  osuMode: string,
  countryCode: string,
  regionCode: string,
  osuPage = 1
) => {
  initRegionalRanking(regionCode);

  if (!osuPage) osuPage = 1;

  const pagesToCheck = convertToGroupsOf5(osuPage);

  let totalPages;
  let replaceIndex = 0;

  const listItems = document.querySelectorAll(".ranking-page-table>tbody>tr");

  for (const page of pagesToCheck) {
    if (functionId != runningId) return;

    const results = await osuWorldCountryRegionRanking(
      countryCode,
      regionCode,
      osuMode,
      page
    );
    if(!results || "error" in results){
      return;
    }

    for (const player of results["top"]) {
      const row = listItems[replaceIndex] as HTMLElement;
      updateRankingRow(row, player);
      await addRegionalFlag(row as HTMLElement, countryCode, regionCode);
      replaceIndex++;
    }

    totalPages = results["pages"];

    // First iteration
    if (page === pagesToCheck[0]) {
      updateRankingPagination(
        osuPage,
        Math.ceil(totalPages / 5),
        osuMode,
        countryCode,
        regionCode
      );
    }

    if (page >= totalPages) break;

  }

  for (let i = listItems.length - 1; i >= replaceIndex; i--) {
    listItems[i].remove();
  }
};

const removeColsRegionalRanking = [7, 6, 5, 3];

const initRegionalRanking = ( regionCode: string) => {
  const modes = document.querySelectorAll(".game-mode [href]");
  for (const mode of modes) {
    const href = mode.getAttribute("href")!;
    const updatedHref = addOrReplaceQueryParam(
      href,
      "region",
      regionCode
    );

    // Already fixed
    if (href === updatedHref) return;

    mode.setAttribute("href", updatedHref);
  }

  const headerRow = document.querySelector(".ranking-page-table>thead>tr")!;
  const headers = headerRow.children;

  for (const index of removeColsRegionalRanking) {
    headers[index].remove();
  }

  headers[2].textContent = "Rank";
};

const updateRankingRow = async (row:HTMLElement, playerData: IosuWorldRegionalPlayerData) => {
  const cells = row?.children;
  //Not loaded yet
  if (!cells) return;
  const flagAndNameCell = cells[1];

  const { id, username, rank, mode, pp } = playerData;

  const nameElement = flagAndNameCell.querySelector(`[${rankingIdAttr}]`)!;
  nameElement.setAttribute(rankingIdAttr, id.toString());
  nameElement.setAttribute("href", buildProfileUrl(id.toString(), mode));
  nameElement.textContent = username;

  const performanceCell = cells[4];
  performanceCell.textContent = Math.round(pp).toLocaleString();

  for (const index of removeColsRegionalRanking) {
    cells[index].remove();
  }
  cells[2].textContent = "#" + rank.toLocaleString();

  row.classList.remove("ranking-page-table__row--inactive");
};

const updateRankingPagination = (
  currentPage: number,
  totalPages: number,
  osuMode: string,
  countryCode: string,
  regionCode: string
) => {
  const paginations = document.querySelectorAll(".pagination-v2") as NodeListOf<HTMLElement> ;

  if (totalPages === 1) {
    paginations.forEach((pagination) => pagination.remove());
    return;
  }

  const firstLink = paginations[0]
    ?.querySelector("a.pagination-v2__link")
    ?.getAttribute("href");

  // If there was pagination
  if (firstLink) {
    const urlObj = new URL(firstLink);
    const searchParams = new URLSearchParams(urlObj.search);
    const regionParam = searchParams.get("region");

    // Already Updated
    if (regionParam) return;
  }

  const htmlTemplates = [
    '<li class="pagination-v2__item"><span class="pagination-v2__link pagination-v2__link--active">5</span></li>',
    '<li class="pagination-v2__item"><a class="pagination-v2__link" href="https://osu.ppy.sh/rankings/fruits/performance?country=ES&amp;page=4#scores">4</a></li>',
    '<li class="pagination-v2__item"> <span class="pagination-v2__link">...</span></li>',
    '<a class="pagination-v2__link pagination-v2__link--quick" href="https://osu.ppy.sh/rankings/fruits/performance?country=US&amp;page=2#scores"> <span class="hidden-xs"> next </span> <i class="fas fa-angle-right"></i> </a>',
    '<span class="pagination-v2__link pagination-v2__link--quick pagination-v2__link--disabled"> <i class="fas fa-angle-left"></i> <span class="hidden-xs"> prev </span> </span>',
  ].map((html) => {
    const template = document.createElement("div");
    template.innerHTML = html;
    return template.firstChild;
  });

  const activePageTemplate = htmlTemplates[0]! as HTMLElement;
  const inactivePageTemplate = htmlTemplates[1]! as HTMLElement;
  const dotsTemplate = htmlTemplates[2]! as HTMLElement;
  const enabledArrow = htmlTemplates[3]! as HTMLElement;
  const disabledArrow = htmlTemplates[4]! as HTMLElement;

  for (const templateWithLink of [
    inactivePageTemplate,
    enabledArrow.parentElement,
  ]) {
    const linkInactive = (templateWithLink as HTMLElement).querySelector("[href]")!;
    const href = linkInactive.getAttribute("href")!;

    let updatedHref = addOrReplaceQueryParam(
      href,
      "region",
      regionCode
    );

    updatedHref = addOrReplaceQueryParam(
      updatedHref,
      "country",
      countryCode
    );
    updatedHref = updatedHref.replace("fruits", osuMode);

    linkInactive.setAttribute("href", updatedHref);
  }

  for (const pagination of paginations) {
    // Fix pages

    const pages = pagination.querySelector(".pagination-v2__col--pages")!;

    const oldPages = pages.querySelectorAll(".pagination-v2__item");
    oldPages.forEach((page) => page.remove());

    let addingPage = 1;
    do {
      var page = pageToAdd(
        addingPage,
        currentPage,
        totalPages,
        activePageTemplate,
        inactivePageTemplate,
        dotsTemplate
      );
      if (page) {
        pages.appendChild(page);
      }
      addingPage++;
    } while (page);

    // Fix arrows

    const oldArrows = pagination.querySelectorAll(
      ".pagination-v2__link--quick"
    );

    const leftArrow =
      (currentPage > 1
        ? enabledArrow.cloneNode(true)
        : disabledArrow.cloneNode(true)) as HTMLElement;
    leftArrow.querySelector(".hidden-xs")!.textContent = "prev";
    oldArrows[0].replaceWith(leftArrow);

    const rightArrow =
      (currentPage < totalPages
        ? enabledArrow.cloneNode(true)
        : disabledArrow.cloneNode(true)) as HTMLElement;
    rightArrow.querySelector(".hidden-xs")!.textContent = "next";
    oldArrows[1].replaceWith(rightArrow);
  }
};

const pageToAdd = (
  addingPage: number,
  currentPage: number,
  totalPages: number,
  activePageTemplate: HTMLElement,
  inactivePageTemplate: HTMLElement,
  dotsTemplate: HTMLElement
) => {
  const useLeftDots = totalPages > 5 && currentPage >= 5;
  const useRightDots = totalPages > 5 && totalPages - currentPage >= 4;
  const paginationElementsCount = Math.min(
    totalPages,
    Math.max(7, 5 + (useLeftDots ? 2 : 0) + (useRightDots ? 2 : 0))
  );

  if (addingPage > paginationElementsCount) {
    return null;
  }

  if (addingPage === currentPage) {
    const node = activePageTemplate.cloneNode(true);
    updatePagePagination(node as HTMLElement, addingPage);
    return node;
  }

  if (useLeftDots && addingPage === 1) {
    const node = inactivePageTemplate.cloneNode(true);
    updatePagePagination(node as HTMLElement, 1);
    return node;
  }

  if (useLeftDots && addingPage === paginationElementsCount) {
    const node = inactivePageTemplate.cloneNode(true);
    updatePagePagination(node as HTMLElement, totalPages);
    return node;
  }

  if (
    (useLeftDots && addingPage === 2) ||
    (useRightDots && addingPage === paginationElementsCount - 1)
  ) {
    const node = dotsTemplate.cloneNode(true);
    return node;
  }

  const node = inactivePageTemplate.cloneNode(true);
  updatePagePagination(node as HTMLElement, addingPage);
  return node;
};

const updatePagePagination = (paginationItem:HTMLElement, page: number) => {
  const link = paginationItem.querySelector(".pagination-v2__link")!;
  link.textContent = page.toString();
  const href = link.getAttribute("href");
  if (href) {
    link.setAttribute(
      "href",
      addOrReplaceQueryParam(href, "page", page.toString())
    );
  }
};