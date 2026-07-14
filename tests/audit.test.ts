import { describe, expect, it } from "vitest";
import { buildContract, renderAuditHtml, scoreSnapshot, type PageSnapshot } from "../packages/cli/src/audit";

const w3c = {
  color: {
    background: { $type: "color", $value: "#ffffff" },
    foreground: { $type: "color", $value: "#111111" },
    primary: { $type: "color", $value: "#3366ff" },
  },
  typography: {
    fontFamily: {
      body: { $value: "Inter, system-ui, sans-serif" },
      heading: { $value: "Inter, system-ui, sans-serif" },
    },
    fontSize: { body: { $value: "1rem" }, heading: { $value: "2rem" } },
    fontWeight: { $value: 400 },
    fontWeightHeading: { $value: 600 },
    fontWeightBold: { $value: 700 },
    lineHeight: { $value: 1.5 },
    letterSpacing: { $value: "0em" },
  },
  spacing: { xxs: { $value: "4px" }, xs: { $value: "8px" } },
  borderRadius: { sm: { $value: "4px" }, md: { $value: "8px" } },
};

const matchingStyles = {
  color: "rgb(17, 17, 17)",
  backgroundColor: "rgb(255, 255, 255)",
  borderTopWidth: "0px", borderRightWidth: "0px", borderBottomWidth: "0px", borderLeftWidth: "0px",
  borderTopStyle: "none", borderRightStyle: "none", borderBottomStyle: "none", borderLeftStyle: "none",
  fontFamily: "Inter, system-ui, sans-serif", fontSize: "16px", fontWeight: "400", lineHeight: "24px", letterSpacing: "0px",
  paddingTop: "8px", paddingRight: "8px", paddingBottom: "8px", paddingLeft: "8px",
  marginTop: "0px", marginRight: "0px", marginBottom: "0px", marginLeft: "0px",
  gap: "0px", rowGap: "0px", columnGap: "0px",
  borderTopLeftRadius: "8px", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", borderBottomLeftRadius: "8px",
};

function snapshot(styles: Record<string, string>): PageSnapshot {
  return { url: "file:///fixture.html", title: "Fixture", rootFontSize: 16, elements: [{ selector: "#card", styles }] };
}

describe("runtime audit", () => {
  it("extracts W3C contract values", () => {
    const contract = buildContract(w3c, 16);
    expect([...contract.colors]).toEqual(["#ffffff", "#111111", "#3366ff", "#000000"]);
    expect(contract.fontSizes).toEqual([16, 32]);
    expect(contract.spacing).toContain(8);
  });

  it("passes a page whose computed styles use contract values", () => {
    const result = scoreSnapshot(snapshot(matchingStyles), w3c, 90);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it("reports off-contract runtime values and renders a self-contained report", () => {
    const result = scoreSnapshot(snapshot({ ...matchingStyles, backgroundColor: "rgb(255, 0, 255)", paddingTop: "13px" }), w3c, 100);
    expect(result.passed).toBe(false);
    expect(result.categories.colors.issues[0].actual).toBe("#ff00ff");
    expect(result.categories.spacing.issues.some((issue) => issue.actual === "13px")).toBe(true);
    const html = renderAuditHtml(result);
    expect(html).toContain("Design Pact Compliance");
    expect(html).toContain("#ff00ff");
  });
});
