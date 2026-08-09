export function selectPersonalContext(sections = []) {
  const profile = sections.find((section) => /^(自我介绍|个人经历|职业经历)$/u.test(section.title.trim()));
  return profile ? `【${profile.title}】\n${profile.content}`.slice(0, 8000) : "";
}
