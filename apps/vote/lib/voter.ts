import { cookies } from "next/headers";

export const VOTER_COOKIE = "otter_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getVoterId() {
  const store = await cookies();

  return store.get(VOTER_COOKIE)?.value ?? crypto.randomUUID();
}
