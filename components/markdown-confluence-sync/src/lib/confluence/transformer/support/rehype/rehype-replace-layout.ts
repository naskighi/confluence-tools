// SPDX-FileCopyrightText: 2025 Telefónica Innovación Digital
// SPDX-License-Identifier: Apache-2.0

import type { Element as HastElement, Root } from "hast";
import type { Plugin as UnifiedPlugin } from "unified";
import { visit } from "unist-util-visit";

/**
 * UnifiedPlugin to replace section and column directives with Confluence macros.
 * Supports:
 * - :::section
 * - :::column
 * - :::column{width="50%"}
 */
const rehypeReplaceLayout: UnifiedPlugin<[], Root> =
  function rehypeReplaceLayout() {
    return function transformer(tree) {
      visit(tree, "element", (node: HastElement, index: number | null, parent: any) => {
        if (!parent || index === null) return;
        
        // Skip processing if inside a code block or preformatted text
        if (parent.tagName === "pre" || parent.tagName === "code") {
          return;
        }

        if (node.tagName === "div") {
          const properties = node.properties || {};
          // Handle both 'className' (HAST standard array) and 'class' (literal string)
          const classNameProp = properties.className;
          const classProp = properties.class;
          
          let classes: string[] = [];
          if (Array.isArray(classNameProp)) {
            classes = classNameProp.map(String);
          } else if (typeof classProp === "string") {
            classes = classProp.split(/\s+/);
          }

          if (classes.includes("directive-section") || classes.includes("section")) {
            node.tagName = "ac:structured-macro";
            node.properties = { "ac:name": "section" };
            // Move children to ac:rich-text-body
            node.children = [
              {
                type: "element",
                tagName: "ac:rich-text-body",
                children: node.children,
              },
            ];
          } else if (classes.includes("directive-column") || classes.includes("column")) {
            node.tagName = "ac:structured-macro";
            node.properties = { "ac:name": "column" };
            
            const width = properties.width as string;
            const macroChildren: HastElement[] = [];
            
            if (width) {
              macroChildren.push({
                type: "element",
                tagName: "ac:parameter",
                properties: { "ac:name": "width" },
                children: [{ type: "text", value: width }],
              });
            }

            macroChildren.push({
              type: "element",
              tagName: "ac:rich-text-body",
              children: node.children,
            });
            
            node.children = macroChildren;
          }
        }
      });
    };
  };

export default rehypeReplaceLayout;
