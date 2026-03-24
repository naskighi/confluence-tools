// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";
import { visit } from "unist-util-visit";

/**
 * UnifiedPlugin to replace TOC markers with Confluence's TOC macro.
 * Supports:
 * - [[toc]] in text nodes
 *
 * @see {@link https://developer.atlassian.com/server/confluence/confluence-storage-format/ | Confluence Storage Format }
 */
const rehypeReplaceToc: UnifiedPlugin<[], Root> =
  function rehypeReplaceToc() {
    return function transformer(tree) {
      const tocRegex = /\[\[toc\]\]/gi;

      visit(tree, "text", (node: any, index: number | null, parent: any) => {
        if (!parent || index === null) return;

        const textNode = node as HastText;
        // Skip processing if inside a code block or preformatted text
        if (parent.tagName === "pre" || parent.tagName === "code") {
          return;
        }

        const value = textNode.value;
        const matches = [...value.matchAll(tocRegex)];

        if (matches.length > 0) {
          const newChildren: (HastElement | HastText)[] = [];
          let lastIndex = 0;

          for (const match of matches) {
            // Add text before the match
            if (match.index! > lastIndex) {
              newChildren.push({
                type: "text",
                value: value.slice(lastIndex, match.index),
              });
            }

            // Add the TOC macro
            newChildren.push(createTocMacro());

            lastIndex = match.index! + match[0].length;
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
 * Creates a Confluence TOC macro HAST element
 */
function createTocMacro(): HastElement {
  return {
    type: "element",
    tagName: "ac:structured-macro",
    properties: {
      "ac:name": "toc",
    },
    children: [],
  };
}

export default rehypeReplaceToc;
