
// https://osu.ppy.sh/community/matches/110067650

import { addFlagUser } from "@src/content-script/osu/flagHtml";
import { idFromProfileUrl, nextFunctionId, runningId } from "./content";

export const updateFlagsMatches = async () => {
  if(!location.href.includes("osu.ppy.sh/community/matches/")) return;
    const functionId = nextFunctionId();  
  
    const linkItem = document.querySelector(".js-react--mp-history");
    if (linkItem) {
      matchesObserver.observe(linkItem, {
        attributes: false,
        childList: true,
        subtree: false,
      });
    }
    watchPlayingGame();
    updateFlagsInMatchPlay(document, functionId);
  };

const gameBeingPlayedMutationObserver = new MutationObserver(
    async (mutations) => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          const score = (addedNode as HTMLElement).querySelector(
            ".mp-history-player-score__main"
          );
          if (score) {
            await updateFlagInMatchScore(score as HTMLElement);
          }
        }
      }
    }
  );
  
  let matchesObserver = new MutationObserver((mutations) => {
    updateFlagsMatches();
    const addedScores = mutations[mutations.length - 1].addedNodes[0];
    if (!addedScores) return;
  
    const matchPlay = (addedScores as HTMLElement).querySelector(
      ".mp-history-game__player-scores"
    );
    if (matchPlay) {
      gameBeingPlayedMutationObserver.observe(matchPlay, {
        attributes: false,
        childList: true,
        subtree: false,
      });
    }
  });
  

  
  const watchPlayingGame = () => {
    const gamesPlayed = document.querySelectorAll(".mp-history-game");
    if (!gamesPlayed || gamesPlayed.length === 0) return;
    const lastGame = gamesPlayed[gamesPlayed.length - 1];
    if (!lastGame) return;
    const scores = lastGame.querySelector(".mp-history-game__player-scores");
    if (scores && scores.children.length === 0) {
      gameBeingPlayedMutationObserver.observe(scores, {
        attributes: false,
        childList: true,
        subtree: false,
      });
    }
  };
  
  const updateFlagsInMatchPlay = async (scores: ParentNode, functionId: number) => {
    const listScores = scores.querySelectorAll(".mp-history-player-score__main");
  
    for (const item of listScores) {
      if (functionId != runningId) {
        return;
      }
      await updateFlagInMatchScore(item as HTMLElement);
    }
  };
  
  const updateFlagInMatchScore = async (item: HTMLElement) => {
    const playerNameElement = item.querySelector(
      ".mp-history-player-score__username"
    ) as HTMLElement;
    const playerId = idFromProfileUrl(playerNameElement.getAttribute("href")!);
    await addFlagUser(item, playerId, true);
  };