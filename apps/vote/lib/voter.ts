import { cookies } from "next/headers";

export const VOTER_COOKIE = "otter_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Anonymous voter identity. The cookie is issued by the proxy; a request that
 * somehow arrives without one still gets a usable (throwaway) id.
 */
export async function getVoterId() {
  const store = await cookies();

  return store.get(VOTER_COOKIE)?.value ?? crypto.randomUUID();
}
