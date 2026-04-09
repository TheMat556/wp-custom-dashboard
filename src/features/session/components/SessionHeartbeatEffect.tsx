import { useSessionHeartbeat } from "../hooks/useSessionHeartbeat";

export function SessionHeartbeatEffect() {
  useSessionHeartbeat();
  return null;
}
