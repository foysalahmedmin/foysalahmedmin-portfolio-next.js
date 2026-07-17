import "dotenv/config";

const main = async (): Promise<void> => {
  const { AdminMfaResetError, parseAdminMfaResetArgs, resetAdminMfa } =
    await import("../src/lib/auth/admin-mfa-reset.ts");
  try {
    const input = parseAdminMfaResetArgs(process.argv.slice(2));
    const result = await resetAdminMfa(input);
    process.stdout.write(
      `MFA reset completed for ${result.email}. The next privileged sign-in must enroll a new factor.\n`
    );
  } catch (error) {
    if (error instanceof AdminMfaResetError) {
      process.stderr.write(`${error.message}\n`);
    } else {
      process.stderr.write(
        "MFA reset failed before the transaction could be confirmed.\n"
      );
    }
    process.exitCode = 1;
  }
};

void main();
