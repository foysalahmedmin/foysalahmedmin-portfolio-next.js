import jwt from "jsonwebtoken";
import {
  AUTH_TOKEN_AUDIENCE,
  AUTH_TOKEN_ISSUER,
  evaluateRefreshPresentation,
  getUserStateHash,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessTokenStrict,
  verifyRefreshTokenStrict,
} from "@/lib/auth/session-security";
import { describe, expect, it } from "vitest";

const USER_ID = "507f1f77bcf86cd799439011";
const SID = "550e8400-e29b-41d4-a716-446655440000";
const FAMILY = "b4c98620-9b72-4f1e-9f91-5d453b88633a";

describe("strict session tokens", () => {
  it("round-trips purpose-bound access and refresh claims", () => {
    const access = signAccessToken(USER_ID, SID);
    const refresh = signRefreshToken(USER_ID, SID, FAMILY, 3);
    const accessClaims = verifyAccessTokenStrict(access.token);
    expect(accessClaims.token_use).toBe("access");
    expect(accessClaims).not.toHaveProperty("email");
    expect(accessClaims).not.toHaveProperty("name");
    expect(accessClaims).not.toHaveProperty("role");
    expect(verifyRefreshTokenStrict(refresh.token)).toMatchObject({
      sid: SID,
      family_id: FAMILY,
      rotation: 3,
      token_use: "refresh",
    });
    expect(() => verifyRefreshTokenStrict(access.token)).toThrow();
  });

  it("rejects issuer and audience mismatch", () => {
    const token = jwt.sign(
      {
        _id: USER_ID,
        name: "Admin",
        email: "admin@example.test",
        role: "admin",
        sid: SID,
        token_use: "access",
      },
      process.env.JWT_ACCESS_SECRET!,
      {
        algorithm: "HS256",
        issuer: `${AUTH_TOKEN_ISSUER}-wrong`,
        audience: AUTH_TOKEN_AUDIENCE,
        expiresIn: 60,
      }
    );
    expect(() => verifyAccessTokenStrict(token)).toThrow();
  });

  it("rejects an expired access token", () => {
    const token = jwt.sign(
      {
        _id: USER_ID,
        name: "Admin",
        email: "admin@example.test",
        role: "admin",
        sid: SID,
        token_use: "access",
      },
      process.env.JWT_ACCESS_SECRET!,
      {
        algorithm: "HS256",
        issuer: AUTH_TOKEN_ISSUER,
        audience: AUTH_TOKEN_AUDIENCE,
        expiresIn: -1,
      }
    );
    expect(() => verifyAccessTokenStrict(token)).toThrow();
  });

  it("uses one-way token hashes and state fingerprints", () => {
    expect(hashRefreshToken("old-token")).not.toBe(
      hashRefreshToken("new-token")
    );
    const active = getUserStateHash({
      role: "admin",
      status: "in-progress",
      is_deleted: false,
      password_changed_at: new Date("2026-01-01T00:00:00Z"),
    });
    const blocked = getUserStateHash({
      role: "admin",
      status: "blocked",
      is_deleted: false,
      password_changed_at: new Date("2026-01-01T00:00:00Z"),
    });
    expect(active).not.toBe(blocked);
  });

  it("detects an older refresh token after rotation", () => {
    expect(
      evaluateRefreshPresentation({
        storedFamilyId: FAMILY,
        storedTokenHash: hashRefreshToken("new-token"),
        storedRotation: 2,
        presentedFamilyId: FAMILY,
        presentedTokenHash: hashRefreshToken("old-token"),
        presentedRotation: 1,
      })
    ).toBe("reuse-detected");
  });
});
