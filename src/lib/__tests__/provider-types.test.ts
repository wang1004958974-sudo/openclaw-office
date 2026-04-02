import { describe, expect, it } from "vitest";
import { inferProviderType } from "@/lib/provider-types";

describe("inferProviderType", () => {
  it("maps Google Generative AI baseUrl to the google provider", () => {
    const provider = inferProviderType(
      "custom-google",
      undefined,
      "https://generativelanguage.googleapis.com/v1beta",
    );

    expect(provider.id).toBe("google");
    expect(provider.name).toBe("Google AI");
  });
});
