import { useTranslation } from "react-i18next";
import { ZONE_CONFIGS } from "../config";
import { LoungeArea } from "../panels/LoungeArea";
import { ZonePanel } from "./ZonePanel";

export function LoungeZone() {
  const { t } = useTranslation("office");
  const cfg = ZONE_CONFIGS.lounge;

  return (
    <>
      <ZonePanel config={cfg}>
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 10,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--lo-muted)",
            opacity: 0.7,
            transform: "translateZ(8px)",
          }}
        >
          {t("livingOffice.zones.lounge")}
        </div>
      </ZonePanel>
      <LoungeArea />
    </>
  );
}
