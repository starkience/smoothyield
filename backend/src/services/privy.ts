import { PrivyClient } from "@privy-io/server-auth";
import { config } from "../config";

const client = config.privyAppId && config.privyAppSecret
  ? new PrivyClient(config.privyAppId, config.privyAppSecret)
  : null;

export type PrivyUserInfo = {
  id: string;
  email?: string;
};

export const verifyPrivyToken = async (token: string): Promise<PrivyUserInfo> => {
  if (config.devMode && (!client || token === "dev")) {
    return { id: "dev-user", email: "dev@local" };
  }
  if (!client) {
    throw new Error("Privy client not configured");
  }
  const user = await client.verifyAuthToken(token);
  return { id: user.userId, email: user.email?.address };
};
