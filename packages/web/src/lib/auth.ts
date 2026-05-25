import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";

export { currentUser };

export function auth() {
  return clerkAuth();
}
