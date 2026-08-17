import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdown, type RenderMarkdownOptions } from "./markdown";

function html(markdown: string, opts: RenderMarkdownOptions = {}) {
  return renderToStaticMarkup(<>{renderMarkdown(markdown, opts)}</>);
}

/** Clicks every citation badge in the rendered tree, in document order. */
function clickCitations(node: React.ReactNode): void {
  React.Children.forEach(node as React.ReactNode, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { className?: string; children?: React.ReactNode; onClick?: (e: unknown) => void };
    if (child.type === "button" && props.className === "citation-badge") {
      props.onClick?.({ preventDefault() {}, stopPropagation() {} });
      return;
    }
    clickCitations(props.children);
  });
}

describe("renderMarkdown block elements", () => {
  it("returns null for empty input", () => {
    expect(renderMarkdown("")).toBeNull();
  });

  it("renders headings up to level 3", () => {
    expect(html("# one")).toContain("<h1>one</h1>");
    expect(html("## two")).toContain("<h2>two</h2>");
    expect(html("### three")).toContain("<h3>three</h3>");
  });

  it("treats a level-4 heading as a paragraph", () => {
    expect(html("#### four")).toBe("<p>#### four</p>");
  });

  it("renders fenced code blocks verbatim", () => {
    expect(html("```ts\nconst a = 1;\nconst b = 2;\n```")).toBe(
      "<pre><code>const a = 1;\nconst b = 2;</code></pre>",
    );
  });

  it("renders an unterminated code fence", () => {
    expect(html("```\nunclosed")).toBe("<pre><code>unclosed</code></pre>");
  });

  it("renders blockquotes", () => {
    expect(html("> quoted")).toBe("<blockquote>quoted</blockquote>");
  });

  it("groups consecutive unordered list items", () => {
    expect(html("- a\n* b\n+ c")).toBe("<ul><li>a</li><li>b</li><li>c</li></ul>");
  });

  it("groups consecutive ordered list items and strips the numbering", () => {
    expect(html("1. first\n2. second")).toBe("<ol><li>first</li><li>second</li></ol>");
  });

  it("renders a horizontal rule", () => {
    expect(html("---")).toContain("<hr");
  });

  it("joins consecutive lines into one paragraph and splits on blank lines", () => {
    expect(html("line one\nline two\n\nsecond para")).toBe(
      "<p>line one line two</p><p>second para</p>",
    );
  });

  it("renders block-like lines that match no rule as paragraphs", () => {
    expect(html(">no space\nnext line")).toBe("<p>&gt;no space next line</p>");
    expect(html("1.no space")).toBe("<p>1.no space</p>");
  });

  it("ignores whitespace-only lines", () => {
    expect(html("   \n\n  ")).toBe("");
  });
});

describe("renderMarkdown inline formatting", () => {
  it("renders bold, italic and inline code", () => {
    expect(html("**b** *i* `c`")).toBe("<p><strong>b</strong> <em>i</em> <code>c</code></p>");
  });

  it("renders links that open safely in a new tab", () => {
    const out = html("[bun](https://bun.sh)");
    expect(out).toContain('href="https://bun.sh"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain(">bun</a>");
  });

  it("renders [[n]] citations as badges", () => {
    const out = html("fact [[2]]");
    expect(out).toContain('class="citation-badge"');
    expect(out).toContain('title="Go to source 2"');
    expect(out).toContain(">2</button>");
  });

  it("renders unicode 【n†...】 citations as badges", () => {
    expect(html("fact 【3†source】")).toContain('title="Go to source 3"');
  });

  it("renders grouped plain [1, 2] citations as one badge per number", () => {
    const out = html("fact [1, 2]");
    expect(out).toContain('class="citation-group"');
    expect(out).toContain('title="Go to source 1"');
    expect(out).toContain('title="Go to source 2"');
  });

  it("keeps surrounding text around inline matches", () => {
    expect(html("before **bold** after")).toBe("<p>before <strong>bold</strong> after</p>");
  });

  it("applies inline formatting inside headings, quotes and list items", () => {
    expect(html("# **big**")).toBe("<h1><strong>big</strong></h1>");
    expect(html("> **q**")).toBe("<blockquote><strong>q</strong></blockquote>");
    expect(html("- `x`")).toBe("<ul><li><code>x</code></li></ul>");
  });

  it("leaves text without inline markers untouched", () => {
    expect(html("nothing special here")).toBe("<p>nothing special here</p>");
  });
});

describe("citation clicks", () => {
  it("reports the clicked source index for each citation style", () => {
    const clicked: number[] = [];
    const tree = renderMarkdown("a [[1]] b 【2†src】 c [3, 4]", {
      onCitationClick: (index) => clicked.push(index),
    });

    clickCitations(tree);

    expect(clicked).toEqual([1, 2, 3, 4]);
  });

  it("does not throw when no handler is supplied", () => {
    expect(() => clickCitations(renderMarkdown("a [[1]] b [2, 3] c 【4†s】"))).not.toThrow();
  });
});
