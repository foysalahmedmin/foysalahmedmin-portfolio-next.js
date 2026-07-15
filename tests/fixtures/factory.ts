let fixtureSequence = 0;

export const resetFixtureSequence = (): void => {
  fixtureSequence = 0;
};

export const createFixtureObjectId = (): string => {
  fixtureSequence += 1;
  return fixtureSequence.toString(16).padStart(24, "0");
};

export const createFixture = <T extends Record<string, unknown>>(
  defaults: T,
  overrides: Partial<T> = {}
): T => ({ ...defaults, ...overrides });
