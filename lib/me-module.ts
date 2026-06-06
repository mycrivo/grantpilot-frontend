/** Frontend M&E kill switch — API_CONTRACT.md §12 feature flag seam. */
export function isMeModuleEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ME_MODULE_ENABLED === "true";
}
