import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "otterchat";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public", "logo.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#050505",
          display: "flex",
          gap: 48,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <img alt="" height={360} src={logoSrc} width={360} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ color: "#ffffff", fontSize: 96, fontWeight: 700 }}>
            otterchat
          </div>
          <div style={{ color: "#a1a1a1", fontSize: 36 }}>
            a chat agent built with eve
          </div>
        </div>
      </div>
    ),
    size,
  );
}
