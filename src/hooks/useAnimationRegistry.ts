import { useEffect } from "react";
import { useAnimationStore } from "../store/useAnimationStore";
import { AnimationRegistry } from "../lib/animationRegistry.types";

export function useAnimationRegistry() {
  const { loadRegistry, setLoadingRegistry, setError } = useAnimationStore();

  useEffect(() => {
    async function fetchRegistry() {
      try {
        setLoadingRegistry(true);
        const response = await fetch("/animations/index.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch animation registry: ${response.statusText}`);
        }
        const data: AnimationRegistry = await response.json();
        loadRegistry(data);
      } catch (err) {
        console.error("Error loading animation registry:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoadingRegistry(false);
      }
    }

    fetchRegistry();
  }, [loadRegistry, setLoadingRegistry, setError]);
}
