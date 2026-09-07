import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { anonymousEveAuth, neonAuthEveAuth, passwordEveAuth } from "@/lib/eve-auth";

export default eveChannel({
  auth: [neonAuthEveAuth, passwordEveAuth, anonymousEveAuth, vercelOidc(), localDev()],
  uploadPolicy: "disabled",
});
