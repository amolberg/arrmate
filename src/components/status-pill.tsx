import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  TriangleAlert,
} from "lucide-react";

import type { IntegrationHealth } from "@/domain/integrations";

const statusCopy: Record<IntegrationHealth, string> = {
  online: "Online",
  degraded: "Needs attention",
  offline: "Offline",
  "not-configured": "Not connected",
};

export function StatusPill({ status }: { status: IntegrationHealth }) {
  const Icon =
    status === "online"
      ? CircleCheck
      : status === "degraded"
        ? TriangleAlert
        : status === "offline"
          ? CircleAlert
          : CircleDashed;
  return (
    <span className={`status-pill status-${status}`}>
      <Icon size={13} aria-hidden="true" />
      {statusCopy[status]}
    </span>
  );
}
