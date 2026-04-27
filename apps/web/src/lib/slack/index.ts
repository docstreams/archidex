import { notifyBetaApply } from "./beta-apply";
import { notifySlack } from "./notify";

export const slack = {
  notify: {
    base: notifySlack,
    betaApply: notifyBetaApply,
  },
};
