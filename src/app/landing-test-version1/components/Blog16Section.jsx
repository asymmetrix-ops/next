import { fetchSubstackArchiveTabs } from "@/lib/fetchSubstackArchive";
import { Blog16 } from "./Blog16";

export async function Blog16Section() {
  const substackTabs = await fetchSubstackArchiveTabs(4);
  return <Blog16 substackTabs={substackTabs} />;
}
