"use client";
import { useCallback, useEffect, useState } from "react";
export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
): Promise<T> {
  const res = await fetch("/api/platform/" + path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Request failed");
  return result;
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    api<T>(path)
      .then((v) => {
        if (current) {
          setData(v);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path]);
  return { data, error, loading, reload };
}
