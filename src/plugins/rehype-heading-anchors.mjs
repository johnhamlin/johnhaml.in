import GithubSlugger from 'github-slugger';

function textContent(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text' || node.type === 'raw') return node.value ?? '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textContent).join('');
}

function propertyString(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function hasAnchor(node) {
  return (node.children ?? []).some((child) => {
    if (child?.type !== 'element' || child.tagName !== 'a') return false;
    const className = child.properties?.class ?? child.properties?.className;
    const value = Array.isArray(className) ? className.join(' ') : String(className ?? '');
    return value.split(/\s+/).includes('heading-anchor');
  });
}

function walk(node, slugger) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'element' && /^h[2-6]$/.test(node.tagName)) {
    const text = textContent(node).trim();
    node.properties = node.properties ?? {};
    let id = propertyString(node.properties.id);
    if (!id) {
      id = slugger.slug(text);
      if (id.endsWith('-')) id = id.slice(0, -1);
    }
    if (id && !hasAnchor(node)) {
      node.properties.id = id;
      node.children = node.children ?? [];
      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: {
          href: `#${id}`,
          class: 'heading-anchor',
          ariaLabel: text ? `Link to ${text}` : 'Link to section',
        },
        children: [{ type: 'text', value: '#' }],
      });
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, slugger);
  }
}

export function rehypeHeadingAnchors() {
  return (tree) => {
    walk(tree, new GithubSlugger());
  };
}
