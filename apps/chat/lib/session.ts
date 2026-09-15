import { auth } from "@/lib/auth";
import type { SetupStatus, Viewer } from "@/lib/chat/types";
import { getSetupStatus } from "@/lib/setup";

const LOCAL_DEV_VIEWER: Viewer = {
  email: "local@eve.dev",
  id: "eve-chat-user",
  image: null,
  name: "eve user",
};

export async function getServerViewer(setupStatus?: SetupStatus): Promise<Viewer | null> {
  const status = setupStatus ?? (await getSetupStatus());

  if (!status.appReady) {
    return null;
  }

  if (status.authMode === "local-dev") {
    return LOCAL_DEV_VIEWER;
  }

  try {
    const { data: session } = await auth.getSession();

    if (!session?.user) {
      return null;
    }

    return {
      email: session.user.email,
      id: session.user.id,
      image: session.user.image ?? null,
      name: session.user.name,
    };
  } catch {
    return null;
  }
}
