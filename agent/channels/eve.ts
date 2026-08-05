import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { neonAuthEveAuth, passwordEveAuth } from "@/lib/eve-auth";

export default eveChannel({
  auth: [neonAuthEveAuth, passwordEveAuth, vercelOidc(), localDev()],
  uploadPolicy: "disabled",
});
