// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text as HastText, ElementContent } from "hast";
import { toString as hastToString } from "hast-util-to-string";
import type { Plugin as UnifiedPlugin } from "unified";
import { visit } from "unist-util-visit";


/**
 * Confluence status colors mapping
 */
const COLOR_MAPPING: Record<string, string> = {
  gray: "Grey",
  grey: "Grey",
  red: "Red",
  danger: "Red",
  yellow: "Yellow",
  warning: "Yellow",
  green: "Green",
  success: "Green",
  blue: "Blue",
  info: "Blue",
};

/**
 * UnifiedPlugin to replace status markers with Confluence's status macro.
 * Supports:
 * - (status: TEXT color: COLOR) in text
 */
const rehypeReplaceStatus: UnifiedPlugin<[], Root> =
  function rehypeReplaceStatus() {
    return function transformer(tree) {
      // 1. Handle (status: TEXT color: COLOR) (text markers)
      // We look for text nodes and replace segments
      // This is a bit complex with unist-util-replace if we want to split the node
      // But for simple cases we can replace the whole text if it matches exactly
      // OR we can use the replace function with a regex if supported (local support might differ)
      
      const statusRegex = /\(status:\s*(.*?)\s*color:\s*(.*?)\)/gi;

      visit(tree, "text", (node: any, index: number | null, parent: any) => {
        if (!parent || index === null) return;

        const textNode = node as HastText;
        // Skip processing if inside a code block or preformatted text
        if (parent.tagName === "pre" || parent.tagName === "code") {
          return;
        }

        const value = textNode.value;
        const matches = [...value.matchAll(statusRegex)];

        if (matches.length > 0) {
          const newChildren: (HastElement | HastText)[] = [];
          let lastIndex = 0;

          for (const match of matches) {
            const matchIndex = match.index!;
            const statusText = match[1];
            const colorName = match[2].toLowerCase();
            const confluenceColor = COLOR_MAPPING[colorName] || "Grey";

            // Add text before the match
            if (matchIndex > lastIndex) {
              newChildren.push({
                type: "text",
                value: value.slice(lastIndex, matchIndex),
              });
            }

            // Add the status macro
            newChildren.push(createStatusMacro(statusText, confluenceColor));

            lastIndex = matchIndex + match[0].length;
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
 * Creates a Confluence status macro HAST element
 */
function createStatusMacro(text: string, color: string): HastElement {
  return {
    type: "element",
    tagName: "ac:structured-macro",
    properties: {
      "ac:name": "status",
    },
    children: [
      {
        type: "element" as const,
        tagName: "ac:parameter",
        properties: { "ac:name": "title" },
        children: [{ type: "text", value: text }],
      },
      {
        type: "element" as const,
        tagName: "ac:parameter",
        properties: { "ac:name": "colour" },
        children: [{ type: "text", value: color }],
      },
    ],
  };
}

export default rehypeReplaceStatus;
