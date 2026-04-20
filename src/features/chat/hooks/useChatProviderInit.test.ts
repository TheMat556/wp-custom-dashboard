import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChatProviderInit } from "./useChatProviderInit";

describe("useChatProviderInit", () => {
  it("should create a chat service with the given config", () => {
    const { result } = renderHook(() =>
      useChatProviderInit({
        restUrl: "https://example.com/wp-json",
        nonce: "test-nonce",
      })
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.fetchBootstrap).toBe("function");
    expect(typeof result.current.fetchPoll).toBe("function");
    expect(typeof result.current.sendMessage).toBe("function");
    expect(typeof result.current.archiveThread).toBe("function");
    expect(typeof result.current.unarchiveThread).toBe("function");
    expect(typeof result.current.deleteThread).toBe("function");
  });

  it("should return the same service instance if restUrl and nonce don't change", () => {
    const { result, rerender } = renderHook(
      (props: { restUrl: string; nonce: string }) => useChatProviderInit(props),
      {
        initialProps: {
          restUrl: "https://example.com/wp-json",
          nonce: "test-nonce",
        },
      }
    );

    const firstService = result.current;

    rerender({
      restUrl: "https://example.com/wp-json",
      nonce: "test-nonce",
    });

    expect(result.current).toBe(firstService);
  });

  it("should create a new service instance if restUrl changes", () => {
    const { result, rerender } = renderHook(
      (props: { restUrl: string; nonce: string }) => useChatProviderInit(props),
      {
        initialProps: {
          restUrl: "https://example.com/wp-json",
          nonce: "test-nonce",
        },
      }
    );

    const firstService = result.current;

    rerender({
      restUrl: "https://different.com/wp-json",
      nonce: "test-nonce",
    });

    expect(result.current).not.toBe(firstService);
  });

  it("should create a new service instance if nonce changes", () => {
    const { result, rerender } = renderHook(
      (props: { restUrl: string; nonce: string }) => useChatProviderInit(props),
      {
        initialProps: {
          restUrl: "https://example.com/wp-json",
          nonce: "test-nonce",
        },
      }
    );

    const firstService = result.current;

    rerender({
      restUrl: "https://example.com/wp-json",
      nonce: "new-nonce",
    });

    expect(result.current).not.toBe(firstService);
  });
});
