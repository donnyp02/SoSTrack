// Utility helpers for manipulating flavor names with container suffixes.
export const normalizeString = (value) => (value || '').toString().trim();

export const combineFlavorName = (baseFlavor, containerName) => {
  const base = normalizeString(baseFlavor);
  const container = normalizeString(containerName);
  if (!container) return base;
  if (!base) return container;

  const baseLower = base.toLowerCase();
  const containerLower = container.toLowerCase();

  if (
    baseLower === containerLower ||
    baseLower.endsWith(` ${containerLower}`) ||
    baseLower.endsWith(containerLower)
  ) {
    return base;
  }

  return `${base} ${container}`.replace(/\s+/g, ' ').trim();
};

export const stripContainerSuffix = (flavorName, templates, targetId = null) => {
  let result = normalizeString(flavorName);
  if (!result) return '';

  const templateList = Array.isArray(templates) ? templates : [];

  const tryRemove = (templateName) => {
    const candidate = normalizeString(templateName);
    if (!candidate) return false;

    const lowerCandidate = candidate.toLowerCase();
    const lowerResult = result.toLowerCase();
    if (!lowerResult) return false;

    if (lowerResult === lowerCandidate) {
      result = '';
      return true;
    }

    const spaced = ` ${lowerCandidate}`;
    if (lowerResult.endsWith(spaced)) {
      const index = lowerResult.lastIndexOf(spaced);
      result = normalizeString(result.slice(0, index));
      return true;
    }

    if (lowerResult.endsWith(lowerCandidate)) {
      const index = lowerResult.lastIndexOf(lowerCandidate);
      result = normalizeString(result.slice(0, index));
      return true;
    }

    return false;
  };

  if (targetId) {
    const targetTemplate = templateList.find((template) => template?.id === targetId);
    if (targetTemplate && tryRemove(targetTemplate.name)) {
      return result;
    }
  }

  for (const template of templateList) {
    if (template?.id === targetId) continue;
    if (tryRemove(template?.name)) break;
  }

  return result;
};
