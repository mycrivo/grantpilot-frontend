import { describe, expect, it } from "vitest";

import { resolveFriendlyApiErrorMessage } from "@/lib/me-error-messages";

describe("UNSUPPORTED_DOCUMENT_FORMAT", () => {
  it("passes through the server lane-specific message", () => {
    const message = resolveFriendlyApiErrorMessage({
      errorCode: "UNSUPPORTED_DOCUMENT_FORMAT",
      message: "This file is not supported for monitoring data. Upload Excel (.xlsx) or CSV (.csv).",
      status: 422,
    });
    expect(message).toContain("Excel (.xlsx) or CSV (.csv)");
  });

  it("falls back when server message is missing", () => {
    expect(
      resolveFriendlyApiErrorMessage({
        errorCode: "UNSUPPORTED_DOCUMENT_FORMAT",
        message: "",
        status: 422,
      }),
    ).toBe("Something went wrong — please try again.");
  });
});
