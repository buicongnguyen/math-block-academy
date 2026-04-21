import type { BoardState, EquationOption } from "./data/curriculum";

export interface ScenePayload {
  mode: "idle" | "equation" | "choice" | "input" | "complete";
  headline: string;
  subheading: string;
  prompt: string;
  board?: BoardState;
  equationOptions?: EquationOption[];
  feedback?: string;
}

class AppBridge extends EventTarget {
  on<T>(type: string, listener: (detail: T) => void): () => void {
    const wrapped = (event: Event) => {
      listener((event as CustomEvent<T>).detail);
    };

    this.addEventListener(type, wrapped as EventListener);

    return () => {
      this.removeEventListener(type, wrapped as EventListener);
    };
  }

  emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent<T>(type, { detail }));
  }
}

export const appBridge = new AppBridge();

