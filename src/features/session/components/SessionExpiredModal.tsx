import { Button, Flex, Modal, Typography } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { sessionStore } from "../store/sessionStore";

const { Text, Title } = Typography;

export function SessionExpiredModal() {
  const expired = useStore(sessionStore, (s) => s.expired);
  const dismiss = useStore(sessionStore, (s) => s.dismiss);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleLogin = useCallback(() => {
    const loginUrl = `${window.location.origin}/wp-login.php`;
    popupRef.current = window.open(loginUrl, "wp_relogin", "width=600,height=700");

    if (!popupRef.current) {
      setPopupBlocked(true);
      return;
    }

    setPopupBlocked(false);

    // Poll for the popup closing (meaning user completed login).
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        popupRef.current = null;
        // After re-login, reload the page to get a fresh nonce.
        window.location.reload();
      }
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <Modal open={expired} closable={false} maskClosable={false} footer={null} centered width={440}>
      <Flex vertical gap={16} align="center" style={{ padding: "16px 0 8px" }}>
        <Title level={4} style={{ margin: 0 }}>
          Session Expired
        </Title>
        <Text type="secondary" style={{ textAlign: "center" }}>
          Your WordPress session has expired. Please log in again to continue working.
        </Text>
        {popupBlocked && (
          <Text type="warning" style={{ textAlign: "center" }}>
            Popup was blocked. Please allow popups for this site, or reload the page below.
          </Text>
        )}
        <Flex gap={12} wrap="wrap" justify="center">
          <Button type="primary" size="large" onClick={handleLogin}>
            Log in again
          </Button>
          {popupBlocked && (
            <Button size="large" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          )}
          <Button size="large" onClick={dismiss}>
            Dismiss
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
