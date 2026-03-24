// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";
import { visit } from "unist-util-visit";

/**
 * UnifiedPlugin to replace Jira issue keys [PROJ-123] and Jira URLs
 * with Confluence's Jira macro.
 */
const rehypeReplaceJira: UnifiedPlugin<[], Root> =
  function rehypeReplaceJira() {
    return function transformer(tree) {
      // Regex for Jira keys like [JCAT-1234]
      const jiraKeyRegex = /\[([A-Z][A-Z0-9]{1,9}-[0-9]+)\]/g;
      
      // Regex for Jira URLs like https://cogna.atlassian.net/browse/JCAT-1234
      const jiraUrlRegex = /https?:\/\/([a-zA-Z0-9.-]+)\.atlassian\.net\/browse\/([A-Z][A-Z0-9]{1,9}-[0-9]+)/g;

      visit(tree, "text", (node: any, index: number | null, parent: any) => {
        if (!parent || index === null) return;

        const textNode = node as HastText;
        // Skip processing if inside a code block or preformatted text
        if (parent.tagName === "pre" || parent.tagName === "code") {
          return;
        }

        const value = textNode.value;
        
        // Find all matches for keys and URLs
        const keyMatches = [...value.matchAll(jiraKeyRegex)];
        const urlMatches = [...value.matchAll(jiraUrlRegex)];
        
        // Combine and sort all matches by index
        const allMatches = [
          ...keyMatches.map(m => ({ index: m.index!, length: m[0].length, key: m[1], type: 'key' })),
          ...urlMatches.map(m => ({ index: m.index!, length: m[0].length, key: m[2], type: 'url' }))
        ].sort((a, b) => a.index - b.index);

        if (allMatches.length > 0) {
          const newChildren: (HastElement | HastText)[] = [];
          let lastIndex = 0;

          for (const match of allMatches) {
            // Check for overlaps (could happen if regex are not careful)
            if (match.index < lastIndex) continue;

            // Add text before the match
            if (match.index > lastIndex) {
              newChildren.push({
                type: "text",
                value: value.slice(lastIndex, match.index),
              });
            }

            // Add the Jira macro
            const macro = createJiraMacro(match.key);
            newChildren.push(macro);

            lastIndex = match.index + match.length;
          }

          // Add remaining text after the last match
          if (lastIndex < value.length) {
            newChildren.push({
              type: "text",
              value: value.slice(lastIndex),
            });
          }

          // Replace the original text node with the new sequence of nodes
          parent.children.splice(index, 1, ...newChildren);

          // Skip the newly inserted nodes to avoid re-processing
          return index + newChildren.length;
        }
      });
    };
  };

/**
 * Creates a Confluence Jira macro HAST element
 */
function createJiraMacro(key?: string, jql?: string): HastElement {
  const children: HastElement[] = [];

  if (key) {
    children.push({
      type: "element",
      tagName: "ac:parameter",
      properties: { "ac:name": "key" },
      children: [{ type: "text", value: key }],
    });
  }

  if (jql) {
    children.push({
      type: "element",
      tagName: "ac:parameter",
      properties: { "ac:name": "jqlQuery" },
      children: [{ type: "text", value: jql }],
    });
    // Add default server if not provided? Usually "System JIRA" is default
    children.push({
      type: "element",
      tagName: "ac:parameter",
      properties: { "ac:name": "server" },
      children: [{ type: "text", value: "System JIRA" }],
    });
  }

  return {
    type: "element",
    tagName: "ac:structured-macro",
    properties: { "ac:name": "jira" },
    children,
  };
}

export default rehypeReplaceJira;
