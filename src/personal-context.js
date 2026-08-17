import { isPersonalProfileSection } from "./section-metadata.js";

export function selectPersonalContext(sections = []) {
  const profile = sections.find(isPersonalProfileSection);
  return profile ? `【${profile.title}】\n${profile.content}`.slice(0, 8000) : "";
}
