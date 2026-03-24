// SPDX-FileCopyrightText: 2024 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root, Text, Content } from "hast";
import { visit } from "unist-util-visit";
import type { Plugin as UnifiedPlugin } from "unified";

/**
 * rehype plugin that turns soft breaks (newlines) into hard breaks (<br />).
 */
const rehypeHardBreaks: UnifiedPlugin<[], Root> =
  function rehypeHardBreaks() {
    return function transformer(tree: Root) {
      visit(tree, "element", (node: HastElement) => {
        if (node.tagName === "p") {
          const newChildren: Content[] = [];
          
          for (const child of node.children) {
            if (child.type === "text") {
              const lines = child.value.split("\n");
              lines.forEach((line, i) => {
                if (line) {
                  newChildren.push({ type: "text", value: line });
                }
                if (i < lines.length - 1) {
                  newChildren.push({
                    type: "element",
                    tagName: "br",
                    properties: {},
                    children: [],
                  });
                }
              });
            } else {
              newChildren.push(child);
            }
          }
          
          node.children = newChildren as HastElement["children"];
        }
      });
    };
  };

export default rehypeHardBreaks;
